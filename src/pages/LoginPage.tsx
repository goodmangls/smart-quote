import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/layout/Header';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { requestMagicLink } from '../api/authApi';
import { clearSignedOutFlag, hasSignedOutFlag, resolvePostLoginPath } from './loginRedirect';

type LoginMode = 'password' | 'magic';

const CARRIERS = ['UPS', 'DHL', 'FedEx'] as const;
const PANEL_POINTS = ['landing.instantQuotes', 'landing.accurateBreakdown', 'landing.liveRates'] as const;

const dotGridStyle: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

const inputClass =
  'w-full py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue transition-colors';

const primaryButtonClass =
  'w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-blue hover:bg-brand-blue-600 text-white text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed';

const secondaryButtonClass =
  'w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50';

const textLinkClass =
  'font-medium text-brand-blue-600 hover:text-brand-blue-700 dark:text-brand-blue-300 dark:hover:text-brand-blue-200 transition-colors focus:outline-none focus-visible:underline';

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    role='alert'
    className='p-3 text-sm rounded-lg border text-destructive-700 bg-destructive-50 border-destructive-200 dark:text-destructive-300 dark:bg-destructive-900/20 dark:border-destructive-800'
  >
    {message}
  </div>
);

// The right half of the split layout (Airtable / Remote / Airwallex pattern on
// Mobbin): the form gets a calm surface of its own, and the brand moves here
// instead of washing a gradient behind the inputs. Hidden below lg — on a
// phone the form is the whole job.
const BrandPanel: React.FC = () => {
  const { t } = useLanguage();
  return (
    <aside className='relative hidden lg:flex overflow-hidden bg-navy'>
      <div className='absolute inset-0 pointer-events-none' style={dotGridStyle} />
      <div className='absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan/20 blur-3xl pointer-events-none' />
      <div className='absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-brand-blue/25 blur-3xl pointer-events-none' />

      <div className='relative flex flex-col justify-center px-12 xl:px-20 py-16 max-w-xl'>
        <ul className='flex gap-2'>
          {CARRIERS.map((carrier) => (
            <li
              key={carrier}
              className='rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wider text-gray-200'
            >
              {carrier}
            </li>
          ))}
        </ul>

        <p className='mt-8 text-3xl xl:text-4xl font-semibold tracking-tight text-white'>
          {t('landing.title.main')} <span className='text-cyan-300'>{t('landing.title.sub')}</span>
        </p>

        <ul className='mt-10 space-y-4'>
          {PANEL_POINTS.map((key) => (
            <li key={key} className='flex items-center gap-3 text-sm text-gray-300'>
              <span className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/15 ring-1 ring-cyan/30'>
                <Check aria-hidden='true' className='h-3.5 w-3.5 text-cyan-300' />
              </span>
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // One-shot: read on mount, cleared in an effect (not in the initializer,
  // which StrictMode calls twice) so a refresh doesn't announce it again.
  const [showSignedOut, setShowSignedOut] = useState(hasSignedOutFlag);
  useEffect(() => {
    clearSignedOutFlag();
  }, []);

  const resetMessages = () => {
    setError('');
    setShowSignedOut(false);
  };

  const switchToMagic = () => {
    resetMessages();
    setMagicSent(false);
    setMode('magic');
  };

  const switchToPassword = () => {
    resetMessages();
    setMagicSent(false);
    setMode('password');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!email.trim() || !password) {
      setError(t('auth.fillAll'));
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate(resolvePostLoginPath(location.state), { replace: true });
      } else {
        setError(result.error || t('auth.invalidCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!email.trim()) {
      setError(t('auth.magicLink.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await requestMagicLink(email.trim());
      setMagicSent(true);
    } catch {
      setError(t('auth.magicLink.requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex flex-col bg-white dark:bg-gray-950'>
      <Header />

      <main className='flex-1 grid lg:grid-cols-2'>
        <section className='flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16'>
          <div className='mx-auto w-full max-w-sm'>
            <Link
              to='/'
              className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors'
            >
              <ArrowLeft aria-hidden='true' className='w-4 h-4' />
              {t('auth.backHome')}
            </Link>

            {/* h1, not h2: this is the page's own title and no h1 exists above
                it, so a screen reader would otherwise land with no page heading. */}
            <h1 className='mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white'>
              {mode === 'password' ? t('auth.signinTitle') : t('auth.magicLink.panelTitle')}
            </h1>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              {mode === 'password' ? t('auth.signinSubtitle') : t('auth.magicLink.panelSubtitle')}
            </p>

            {showSignedOut && (
              <div
                role='status'
                className='mt-6 flex items-start gap-3 p-3 rounded-lg border text-success-800 bg-success-50 border-success-200 dark:text-success-300 dark:bg-success-900/20 dark:border-success-800'
              >
                <CheckCircle2 aria-hidden='true' className='mt-0.5 h-4 w-4 shrink-0' />
                <div className='text-sm'>
                  <p className='font-semibold'>{t('auth.signedOut.title')}</p>
                  <p className='mt-0.5 opacity-90'>{t('auth.signedOut.body')}</p>
                </div>
              </div>
            )}

            <div className='mt-8'>
              {mode === 'password' ? (
                <form className='space-y-5' onSubmit={handlePasswordLogin} noValidate>
                  {error && <ErrorAlert message={error} />}

                  <div>
                    <label
                      htmlFor='login-email'
                      className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
                    >
                      {t('auth.email')}
                    </label>
                    <div className='relative'>
                      <Mail
                        aria-hidden='true'
                        className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none'
                      />
                      <input
                        id='login-email'
                        name='email'
                        type='email'
                        autoComplete='email'
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputClass} pl-10 pr-4`}
                        placeholder='name@company.com'
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='login-password'
                      className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
                    >
                      {t('auth.password')}
                    </label>
                    <div className='relative'>
                      <Lock
                        aria-hidden='true'
                        className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none'
                      />
                      <input
                        id='login-password'
                        name='password'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='current-password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pl-10 pr-11`}
                        placeholder='••••••••'
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword((v) => !v)}
                        className='absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50'
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPassword ? (
                          <EyeOff className='w-4 h-4' />
                        ) : (
                          <Eye className='w-4 h-4' />
                        )}
                      </button>
                    </div>
                    {/* Says what it actually does: there is no password-reset
                        flow, so "forgot password" leads to a sign-in link. */}
                    <div className='mt-2 text-right'>
                      <button
                        type='button'
                        onClick={switchToMagic}
                        className={`text-xs ${textLinkClass}`}
                      >
                        {t('auth.forgotPasswordLink')}
                      </button>
                    </div>
                  </div>

                  <button type='submit' disabled={loading} className={primaryButtonClass}>
                    {loading ? t('auth.signingIn') : t('auth.signin')}
                    {!loading && <ArrowRight aria-hidden='true' className='w-4 h-4' />}
                  </button>

                  <div className='flex items-center gap-3'>
                    <div className='h-px flex-1 bg-gray-200 dark:bg-gray-800' />
                    <span className='text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                      {t('auth.or')}
                    </span>
                    <div className='h-px flex-1 bg-gray-200 dark:bg-gray-800' />
                  </div>

                  <button type='button' onClick={switchToMagic} className={secondaryButtonClass}>
                    <Mail
                      aria-hidden='true'
                      className='w-4 h-4 text-brand-blue-600 dark:text-brand-blue-300'
                    />
                    {t('auth.passwordFreeLink')}
                  </button>
                </form>
              ) : magicSent ? (
                <div className='space-y-5'>
                  <div
                    role='status'
                    className='p-4 text-sm rounded-lg border text-success-800 bg-success-50 border-success-200 dark:text-success-300 dark:bg-success-900/20 dark:border-success-800'
                  >
                    <p className='font-semibold mb-1'>{t('auth.magicLink.sent')}</p>
                    <p className='opacity-90'>{t('auth.magicLink.sentBody')}</p>
                    {email.trim() && (
                      <p className='mt-2 text-xs'>
                        → <span className='font-semibold'>{email.trim()}</span>
                      </p>
                    )}
                  </div>
                  <button type='button' onClick={switchToPassword} className={secondaryButtonClass}>
                    {t('auth.magicLink.usePassword')}
                  </button>
                </div>
              ) : (
                <form className='space-y-5' onSubmit={handleMagicLink} noValidate>
                  {error && <ErrorAlert message={error} />}

                  <div className='flex items-start gap-3 rounded-lg border border-brand-blue-100 bg-brand-blue-50 p-4 dark:border-brand-blue-800 dark:bg-brand-blue-900/30'>
                    <span className='mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-blue-600 ring-1 ring-brand-blue-100 dark:bg-brand-blue-900/60 dark:text-brand-blue-200 dark:ring-brand-blue-800'>
                      <ShieldCheck aria-hidden='true' className='h-4 w-4' />
                    </span>
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                        {t('auth.magicLink.noticeTitle')}
                      </p>
                      <p className='text-xs leading-5 text-gray-600 dark:text-gray-300'>
                        {t('auth.magicLink.noticeBody')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='magic-email'
                      className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
                    >
                      {t('auth.magicLink.emailLabel')}
                    </label>
                    <div className='relative'>
                      <Mail
                        aria-hidden='true'
                        className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none'
                      />
                      <input
                        id='magic-email'
                        name='magic-email'
                        type='email'
                        autoComplete='email'
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputClass} pl-10 pr-4`}
                        placeholder='name@company.com'
                      />
                    </div>
                  </div>

                  <button type='submit' disabled={loading} className={primaryButtonClass}>
                    {loading ? t('auth.magicLink.sending') : t('auth.magicLink.send')}
                  </button>

                  <button
                    type='button'
                    onClick={switchToPassword}
                    className={`w-full inline-flex items-center justify-center gap-1.5 py-2 text-sm ${textLinkClass}`}
                  >
                    <ArrowLeft aria-hidden='true' className='w-4 h-4' />
                    {t('auth.magicLink.usePassword')}
                  </button>
                </form>
              )}
            </div>

            <p className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400'>
              {t('auth.noAccount')}{' '}
              <Link to='/signup' className={`font-semibold ${textLinkClass}`}>
                {t('auth.signup')}
              </Link>
            </p>
          </div>
        </section>

        <BrandPanel />
      </main>
    </div>
  );
};

export default LoginPage;
