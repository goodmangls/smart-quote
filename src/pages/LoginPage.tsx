import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/layout/Header';
import { LogIn, ArrowLeft, Mail } from 'lucide-react';
import { requestMagicLink } from '../api/authApi';
import { resolveLoginRedirect } from '../lib/safeRedirect';

const dotGridStyle: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);

  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);

  // apps/insights middleware 가 비로그인 사용자를 `/login?redirect=/insights/admin`
  // 으로 보낸다. resolveLoginRedirect 가 화이트리스트 prefix + open redirect 방어.
  const safeQueryRedirect = resolveLoginRedirect(searchParams.get('redirect'));
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email.trim() && password.trim()) {
      setIsLoading(true);
      try {
        const result = await login(email.trim(), password.trim());
        if (result.success) {
          // English is the default for all users regardless of nationality.
          // Users can manually switch via the language selector in the header.

          const userRole = result.user?.role || 'user';
          const defaultDest = userRole === 'admin' ? '/admin' : '/dashboard';

          // ?redirect= 안전 path 가 있으면 최우선 (insights middleware 흐름).
          // /insights/* 는 Vercel rewrite 를 타야 하므로 SPA navigate() 가 아닌
          // full document load 사용 — 안 그러면 SPA catch-all 로 떨어져 / 로 redirect.
          if (safeQueryRedirect) {
            if (safeQueryRedirect === '/insights' || safeQueryRedirect.startsWith('/insights/')) {
              window.location.assign(safeQueryRedirect);
            } else {
              navigate(safeQueryRedirect, { replace: true });
            }
          } else if (from === '/' || from === '/login' || from === '/dashboard') {
            navigate(defaultDest, { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        } else {
          setError(result.error || t('auth.invalidCredentials'));
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setError(t('auth.fillAll'));
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicError('');
    if (!magicEmail.trim()) {
      setMagicError(t('auth.magicLink.emailRequired'));
      return;
    }
    setMagicLoading(true);
    try {
      await requestMagicLink(magicEmail.trim());
      setMagicSent(true);
    } catch {
      setMagicError(t('auth.magicLink.requestFailed'));
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      <Header />

      <div className='relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black'>
        <div className='absolute inset-0 pointer-events-none' style={dotGridStyle} />
        <div className='absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none' />
        <div className='absolute -bottom-40 -left-40 w-[300px] h-[300px] rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none' />

        <div className='relative flex flex-col items-center justify-center py-16 sm:py-24 px-4'>
          <Link
            to='/'
            className='inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-8 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            {t('auth.backHome')}
          </Link>

          <div className='w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-6'>
            <LogIn className='w-7 h-7 text-cyan-400' />
          </div>

          <h2 className='text-2xl sm:text-3xl font-extrabold text-white text-center mb-2'>
            {t('auth.signinTitle')}
          </h2>
          <p className='text-sm text-gray-400 text-center'>{t('auth.systemName')}</p>

          <div className='w-full max-w-md mt-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl'>
            <form className='space-y-5' onSubmit={handleSubmit}>
              {error && (
                <div className='p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl'>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-300 mb-1.5'>
                  {t('auth.email')}
                </label>
                <input
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-colors'
                  placeholder='name@company.com'
                />
              </div>

              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-300 mb-1.5'
                >
                  {t('auth.password')}
                </label>
                <input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='current-password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-colors'
                />
              </div>

              <button
                type='submit'
                disabled={isLoading}
                className='w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-600/25 hover:shadow-cyan-500/30 transition-all duration-200'
              >
                {t('auth.signin')}
              </button>
            </form>

            <div className='mt-6 pt-5 border-t border-white/10 text-center'>
              <p className='text-sm text-gray-400'>
                {t('auth.noAccount')}{' '}
                <Link
                  to='/signup'
                  className='font-semibold text-cyan-400 hover:text-cyan-300 transition-colors'
                >
                  {t('auth.signup')}
                </Link>
              </p>
            </div>
          </div>

          {/* Magic Link Section */}
          <div className='w-full max-w-md mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl'>
            <div className='flex items-center gap-2 mb-4'>
              <Mail className='w-4 h-4 text-cyan-400' />
              <h3 className='text-sm font-semibold text-gray-300'>{t('auth.magicLink.title')}</h3>
            </div>

            {magicSent ? (
              <div className='p-4 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl'>
                <p className='font-medium mb-1'>{t('auth.magicLink.sent')}</p>
                <p className='text-green-400/70'>{t('auth.magicLink.sentBody')}</p>
              </div>
            ) : (
              <form className='space-y-3' onSubmit={handleMagicLink}>
                {magicError && (
                  <div className='p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl'>
                    {magicError}
                  </div>
                )}
                <div>
                  <label
                    htmlFor='magic-email'
                    className='block text-sm font-medium text-gray-300 mb-1.5'
                  >
                    {t('auth.magicLink.emailLabel')}
                  </label>
                  <input
                    id='magic-email'
                    name='magic-email'
                    type='email'
                    autoComplete='email'
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    className='w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-colors'
                    placeholder='name@company.com'
                  />
                </div>
                <button
                  type='submit'
                  disabled={magicLoading}
                  className='w-full py-3 px-4 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm font-semibold rounded-xl border border-white/20 hover:border-white/30 transition-all duration-200'
                >
                  {magicLoading ? t('auth.magicLink.sending') : t('auth.magicLink.send')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
