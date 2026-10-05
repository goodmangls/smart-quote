import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Header } from '../layout/Header';
import { useLanguage } from '../../contexts/LanguageContext';
import { InteractiveDotGrid } from '../ui/InteractiveDotGrid';
import { DeliveryPhoto } from '../ui/DeliveryPhoto';

const CARRIERS = ['UPS', 'DHL', 'FedEx'] as const;
const PANEL_POINTS = [
  'landing.instantQuotes',
  'landing.accurateBreakdown',
  'landing.liveRates',
] as const;

// The right half of the split layout (Airtable / Remote / Airwallex pattern on
// Mobbin): the form gets a calm surface of its own, and the brand moves here
// instead of washing a gradient behind the inputs. Hidden below lg — on a
// phone the form is the whole job.
const BrandPanel: React.FC = () => {
  const { t } = useLanguage();
  return (
    <aside className='relative hidden lg:flex flex-col overflow-hidden bg-navy'>
      {/* Photo band, fading into the navy below so the copy never sits on the
          image. The source is 2:1 at 1440px — 2× this half-screen band — and
          lazy, so phones (panel hidden) never download it. */}
      <div className='relative h-2/5 min-h-56 shrink-0'>
        <DeliveryPhoto photo='courier' className='absolute inset-0' imgClassName='object-left' />
        <div
          aria-hidden='true'
          className='absolute inset-0 bg-gradient-to-b from-navy/20 via-navy/10 to-navy pointer-events-none'
        />
      </div>

      <div className='relative flex-1 flex'>
        <InteractiveDotGrid tone='navy' />
        <div className='absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-brand-blue/25 blur-3xl pointer-events-none' />

        <div className='relative flex flex-col justify-center px-12 xl:px-20 py-12 max-w-xl'>
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
            {t('landing.title.main')}{' '}
            <span className='text-cyan-300'>{t('landing.title.sub')}</span>
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
      </div>
    </aside>
  );
};

interface AuthLayoutProps {
  children: React.ReactNode;
  /** "Back to Home" link above the content. Off for transient states. */
  showBackLink?: boolean;
}

// Shell shared by login, signup and magic-link verify: header, form column on
// a plain surface, brand panel on the right. DESIGN.md §8.8.
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, showBackLink = true }) => {
  const { t } = useLanguage();
  return (
    <div className='min-h-screen flex flex-col bg-white dark:bg-gray-950'>
      <Header />

      <main className='flex-1 grid lg:grid-cols-2'>
        <section className='relative overflow-hidden flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16'>
          <InteractiveDotGrid subtle />
          <div className='relative mx-auto w-full max-w-sm'>
            {showBackLink && (
              <Link
                to='/'
                className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors'
              >
                <ArrowLeft aria-hidden='true' className='w-4 h-4' />
                {t('auth.backHome')}
              </Link>
            )}
            {children}
          </div>
        </section>

        <BrandPanel />
      </main>
    </div>
  );
};

export const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    role='alert'
    className='p-3 text-sm rounded-lg border text-destructive-700 bg-destructive-50 border-destructive-200 dark:text-destructive-300 dark:bg-destructive-900/20 dark:border-destructive-800'
  >
    {message}
  </div>
);
