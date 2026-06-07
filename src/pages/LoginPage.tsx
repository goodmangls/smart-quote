import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/layout/Header';
import { ArrowLeft, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { requestMagicLink } from '../api/authApi';

const dotGridStyle: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

export const LoginPage: React.FC = () => {
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);

  const { t } = useLanguage();
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
            <Sparkles className='w-7 h-7 text-cyan-400' />
          </div>

          <h2 className='text-2xl sm:text-3xl font-extrabold text-white text-center mb-2'>
            {t('auth.signinTitle')}
          </h2>
          <p className='text-sm text-gray-400 text-center'>{t('auth.magicLink.description')}</p>

          {/* Magic Link Section */}
          <div className='w-full max-w-md mt-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl'>
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

            <div className='mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'>
              <div className='flex items-start gap-3'>
                <span className='mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-200/20'>
                  <ShieldCheck className='h-4 w-4' />
                </span>
                <div className='space-y-1'>
                  <p className='text-sm font-semibold text-cyan-50'>{t('auth.magicLink.noticeTitle')}</p>
                  <p className='text-xs leading-5 text-cyan-50/70'>{t('auth.magicLink.noticeBody')}</p>
                </div>
              </div>
            </div>

            <div className='mt-5 text-center'>
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
