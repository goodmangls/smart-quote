import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/browser';
import { API_URL, AUTH_EXPIRED_EVENT } from '@/api/apiClient';
import {
  clearAllTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/authStorage';

export type UserRole = 'admin' | 'user' | 'member';

export type FreightNetwork = 'WCA' | 'MPL' | 'EAN' | 'JCtrans';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  company?: string;
  name?: string;
  nationality?: string;
  networks?: FreightNetwork[];
  intercom_hash?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithMagicLink: (token: string) => Promise<AuthResult>;
  signup: (
    email: string,
    password: string,
    company?: string,
    name?: string,
    nationality?: string,
    networks?: FreightNetwork[],
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getAuthErrorMessage(response: Response, fallback: string): Promise<string> {
  const status = response.status;
  if (status === 401) return 'Invalid credentials';
  if (status === 403) return 'Access denied';
  if (status >= 500) return 'Server error';
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return fallback;

  const body = await response.json().catch(() => ({}));
  const message = body?.error?.message || body?.error || body?.errors?.[0];

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getRefreshToken());

  // Restore session on mount using refresh token
  useEffect(() => {
    const refreshToken = getRefreshToken();

    // Migration: remove legacy localStorage token
    localStorage.removeItem('smartQuoteToken');

    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    // credentials: 'include' — bl_session httpOnly cookie 회전 (insights-admin-rails-auth).
    fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Refresh failed');
      })
      .then((data: { token: string; refresh_token?: string; user: User }) => {
        setAccessToken(data.token);
        // Refresh token rotation: persist new refresh token if issued
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token);
        }
        setUser(data.user);
      })
      .catch(() => {
        clearAllTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Auto-refresh access token every 14 minutes (token expires in 15)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(
      () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return;
        fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
          credentials: 'include',
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error();
          })
          .then((data: { token: string; refresh_token?: string }) => {
            setAccessToken(data.token);
            // Refresh token rotation: persist new refresh token if issued
            if (data.refresh_token) {
              setRefreshToken(data.refresh_token);
            }
          })
          .catch(() => {
            /* next API call will trigger 401 → retry logic */
          });
      },
      14 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.token);
        setRefreshToken(data.refresh_token);
        setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: await getAuthErrorMessage(res, 'Login failed') };
    } catch (e) {
      Sentry.captureException(e);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      company?: string,
      name?: string,
      nationality?: string,
      networks?: FreightNetwork[],
    ): Promise<AuthResult> => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            password_confirmation: password,
            company,
            name,
            nationality,
            networks: networks && networks.length > 0 ? networks : undefined,
          }),
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.token);
          setRefreshToken(data.refresh_token);
          setUser(data.user);
          return { success: true, user: data.user };
        }

        return { success: false, error: await getAuthErrorMessage(res, 'Registration failed') };
      } catch (e) {
        Sentry.captureException(e);
        return { success: false, error: 'Network error' };
      }
    },
    [],
  );

  const loginWithMagicLink = useCallback(async (token: string): Promise<AuthResult> => {
    try {
      const { verifyMagicLink } = await import('@/api/authApi');
      const data = await verifyMagicLink(token);
      setAccessToken(data.token);
      setRefreshToken(data.refresh_token);
      setUser(data.user as User);
      return { success: true, user: data.user as User };
    } catch (e) {
      Sentry.captureException(e);
      const message = e instanceof Error ? e.message : 'Invalid or expired magic link';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    // Rails 가 httpOnly bl_session cookie 를 발급하므로 클라이언트가 직접 못 지움.
    // 서버 endpoint 호출로 만료 cookie 발급 → 클라이언트 토큰 삭제.
    // 네트워크 실패해도 클라이언트 측은 무조건 정리 (best-effort).
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // 네트워크 오류여도 클라이언트 정리는 진행
    }
    clearAllTokens();
    setUser(null);
  }, []);

  // Listen for 401 auth expiry events from apiClient
  useEffect(() => {
    const handleAuthExpired = () => {
      clearAllTokens();
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      try {
        const token = getAccessToken();
        if (!token) throw new Error('No token found');

        const res = await fetch(`${API_URL}/api/v1/auth/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: newPassword,
          }),
          credentials: 'include',
        });

        if (res.ok) {
          return { success: true };
        }

        return { success: false, error: await getAuthErrorMessage(res, 'Password update failed') };
      } catch (e) {
        Sentry.captureException(e);
        return { success: false, error: 'Network error' };
      }
    },
    [],
  );

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white dark:bg-gray-950'>
        <div className='w-6 h-6 border-2 border-gray-300 border-t-brand-blue-500 rounded-full animate-spin' />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithMagicLink,
        signup,
        logout,
        updatePassword,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
