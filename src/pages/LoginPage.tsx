import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/layout/Header';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { requestMagicLink } from '../api/authApi';

type LoginMode = 'password' | 'magic';

const dotGridStyle: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
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

  const switchToMagic = () => {
    setError('');
    setMagicSent(false);
    setMode('magic');
  };

  const switchToPassword = () => {
    setError('');
    setMagicSent(false);
    setMode('password');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(t('auth.fillAll'));
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || t('auth.invalidCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <div className="relative overflow-hidden bg-gradient-to-br from-navy via-deep-blue to-black">
        <div className="absolute inset-0 pointer-events-none" style={dotGridStyle} />
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-cyan/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[300px] h-[300px] rounded-full bg-brand-blue/20 blur-[100px] pointer-events-none" />

        <div className="relative flex flex-col items-center justify-center py-16 sm:py-24 px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backHome')}
          </Link>

          <div className="w-14 h-14 rounded-2xl bg-cyan/20 border border-cyan/30 flex items-center justify-center mb-6">
            <Sparkles className="w-7 h-7 text-cyan-400" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-2">
            {mode === 'password' ? t('auth.signinTitle') : t('auth.magicLink.panelTitle')}
          </h2>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            {mode === 'password' ? t('auth.signinSubtitle') : t('auth.magicLink.panelSubtitle')}
          </p>

          <div className="w-full max-w-md mt-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {mode === 'password' ? (
              <form className="space-y-4" onSubmit={handlePasswordLogin} noValidate>
                {error && (
                  <div
                    role="alert"
                    className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 text-sm transition-colors"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-gray-300"
                    >
                      {t('auth.password')}
                    </label>
                    <button
                      type="button"
                      onClick={switchToMagic}
                      className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 text-sm transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-blue hover:bg-brand-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-blue/20 transition-all duration-200"
                >
                  {loading ? t('auth.signingIn') : t('auth.signin')}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] uppercase tracking-wider text-gray-500">
                    {t('auth.or')}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={switchToMagic}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium rounded-xl border border-white/15 hover:border-white/25 transition-all duration-200"
                >
                  <Mail className="w-4 h-4 text-cyan-400" />
                  {t('auth.passwordFreeLink')}
                </button>
              </form>
            ) : magicSent ? (
              <div className="space-y-5">
                <div className="p-4 text-sm text-success-400 bg-success/10 border border-success/20 rounded-xl">
                  <p className="font-medium mb-1">{t('auth.magicLink.sent')}</p>
                  <p className="text-success-400/70">{t('auth.magicLink.sentBody')}</p>
                  {email.trim() && (
                    <p className="mt-2 text-xs text-gray-400">
                      → <span className="text-white font-medium">{email.trim()}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={switchToPassword}
                  className="w-full py-3 px-4 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
                >
                  {t('auth.magicLink.usePassword')}
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleMagicLink} noValidate>
                {error && (
                  <div
                    role="alert"
                    className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    {error}
                  </div>
                )}

                <div className="rounded-xl border border-cyan/20 bg-cyan/10 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan-200 ring-1 ring-cyan/20">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-cyan-50">
                        {t('auth.magicLink.noticeTitle')}
                      </p>
                      <p className="text-xs leading-5 text-cyan-50/70">
                        {t('auth.magicLink.noticeBody')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="magic-email"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    {t('auth.magicLink.emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="magic-email"
                      name="magic-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan/50 focus:border-cyan/50 text-sm transition-colors"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan hover:bg-cyan-600 disabled:opacity-50 text-navy text-sm font-semibold rounded-xl shadow-lg shadow-cyan/20 transition-all duration-200"
                >
                  {loading ? t('auth.magicLink.sending') : t('auth.magicLink.send')}
                </button>

                <button
                  type="button"
                  onClick={switchToPassword}
                  className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-1"
                >
                  ← {t('auth.magicLink.usePassword')}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                {t('auth.noAccount')}{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {t('auth.signup')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
