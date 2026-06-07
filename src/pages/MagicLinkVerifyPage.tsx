import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams();
  const { loginWithMagicLink } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      queueMicrotask(() => setError(t('auth.magicLink.invalidLink')));
      return;
    }

    // Strip the token from the browser URL / history before the network call resolves.
    // This reduces exposure through browser history, Referer headers, and bfcache.
    window.history.replaceState(null, '', '/auth/verify');

    loginWithMagicLink(token).then((result) => {
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error ?? t('auth.magicLink.expired'));
      }
    });
  }, [searchParams, loginWithMagicLink, navigate, t]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4'>
        <div className='text-center max-w-md'>
          <div className='w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-6 h-6 text-red-600 dark:text-red-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
            {t('auth.magicLink.failed')}
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className='inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 rounded-lg transition-colors'
          >
            {t('auth.magicLink.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-white dark:bg-gray-950'>
      <div className='text-center'>
        <div className='w-8 h-8 border-2 border-gray-300 border-t-brand-blue-500 rounded-full animate-spin mx-auto mb-4' />
        <p className='text-sm text-gray-600 dark:text-gray-400'>{t('auth.magicLink.verifying')}</p>
      </div>
    </div>
  );
}
