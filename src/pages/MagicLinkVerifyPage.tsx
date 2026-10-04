import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, XCircle } from 'lucide-react';
import { AuthLayout, ErrorAlert } from '@/components/auth/AuthLayout';
import { authPrimaryButtonClass } from '@/components/auth/authStyles';

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
      <AuthLayout showBackLink={false}>
        <span className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive-50 text-destructive-600 ring-1 ring-destructive-200 dark:bg-destructive-900/20 dark:text-destructive-300 dark:ring-destructive-800'>
          <XCircle aria-hidden='true' className='h-6 w-6' />
        </span>
        <h1 className='mt-6 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white'>
          {t('auth.magicLink.failed')}
        </h1>
        <div className='mt-6'>
          <ErrorAlert message={error} />
        </div>
        <button
          type='button'
          onClick={() => navigate('/login', { replace: true })}
          className={`mt-8 ${authPrimaryButtonClass}`}
        >
          <ArrowLeft aria-hidden='true' className='h-4 w-4' />
          {t('auth.magicLink.backToLogin')}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showBackLink={false}>
      <div role='status' className='flex flex-col items-center text-center'>
        <div className='h-10 w-10 rounded-full border-2 border-gray-200 border-t-brand-blue dark:border-gray-700 dark:border-t-brand-blue-300 animate-spin motion-reduce:animate-none' />
        <p className='mt-4 text-sm font-medium text-gray-700 dark:text-gray-300'>
          {t('auth.magicLink.verifying')}
        </p>
      </div>
    </AuthLayout>
  );
}
