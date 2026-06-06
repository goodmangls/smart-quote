import { API_URL } from './apiClient';
import { ApiError } from './apiClient';

export interface MagicLinkResponse {
  message: string;
}

export interface VerifyMagicLinkResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string | null;
    role: 'admin' | 'user' | 'member';
    company: string | null;
  };
}

export async function requestMagicLink(email: string): Promise<MagicLinkResponse> {
  // credentials: 'include' — Rails 가 bl_session httpOnly cookie 를 발급/갱신하므로 필수.
  const response = await fetch(`${API_URL}/api/v1/auth/magic_link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message || body?.error || body?.message || 'Request failed';
    throw new ApiError(response.status, message);
  }

  return response.json();
}

export async function verifyMagicLink(token: string): Promise<VerifyMagicLinkResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/auth/magic_link/verify?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body?.error?.message || body?.error || body?.message || 'Invalid or expired magic link';
    throw new ApiError(response.status, message);
  }

  return response.json();
}
