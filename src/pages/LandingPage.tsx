import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, ShieldCheck, ArrowRight, Globe, Truck, Plane } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { InteractiveDotGrid } from '../components/ui/InteractiveDotGrid';

// A light surface / dark navy hero with a reactive dot grid (DESIGN.md §8.10).
// Mobbin: Railway, Dovetail (left-aligned hero,
// one honest product card instead of glass layers), Notion (button pair).

// Illustrative numbers only. They must add up — a preview whose total doesn't
// match its own lines undermines the one claim the page makes (accuracy).
const SAMPLE_LINES = [
  { key: 'landing.mock.freight', usd: 386.2 },
  { key: 'landing.mock.fsc', usd: 96.2 },
  { key: 'landing.mock.packing', usd: 68.1 },
] as const;
const SAMPLE_TOTAL = SAMPLE_LINES.reduce((sum, line) => sum + line.usd, 0);

const usd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SampleQuoteCard: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <figure className='relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto rounded-xl border border-white/10 bg-deep-blue shadow-xl overflow-hidden'>
    <figcaption className='flex items-center justify-between px-5 py-3 border-b border-white/10'>
      <span className='text-xs font-medium uppercase tracking-wider text-gray-400'>
        {t('landing.mock.sample')}
      </span>
      <span className='rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white'>
        DHL Express
      </span>
    </figcaption>

    <dl className='px-5 py-4 grid grid-cols-2 gap-4 border-b border-white/10'>
      <div className='col-span-2'>
        <dt className='text-xs text-gray-400'>{t('landing.mock.routeLabel')}</dt>
        <dd className='mt-1 flex items-center gap-2 text-sm font-semibold text-white'>
          <Plane aria-hidden='true' className='w-4 h-4 text-cyan-300 shrink-0' />
          {t('landing.mock.route')}
        </dd>
      </div>
      <div className='col-span-2'>
        <dt className='text-xs text-gray-400'>{t('landing.mock.cargo')}</dt>
        <dd className='mt-1 text-sm font-semibold text-white'>{t('landing.mock.cargoValue')}</dd>
      </div>
    </dl>

    <dl className='px-5 py-4 space-y-2.5 text-sm'>
      {SAMPLE_LINES.map((line) => (
        <div key={line.key} className='flex items-center justify-between'>
          <dt className='text-gray-300'>{t(line.key)}</dt>
          <dd className='font-medium text-white tabular-nums'>{usd(line.usd)}</dd>
        </div>
      ))}
    </dl>

    <div className='mx-5 mb-5 flex items-end justify-between rounded-lg bg-navy px-4 py-3 ring-1 ring-white/10'>
      <span className='text-sm font-medium text-gray-300'>{t('landing.mock.total')}</span>
      <span className='text-2xl font-semibold tracking-tight text-white tabular-nums'>
        {usd(SAMPLE_TOTAL)}
      </span>
    </div>
  </figure>
);

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = 'BridgeLogis — Global Express Freight Quoting Platform';
  }, []);

  const stats = [
    { value: '3', label: t('landing.stat.carriers'), icon: Truck },
    { value: '220+', label: t('landing.stat.countries'), icon: Globe },
    { value: '~1s', label: t('landing.stat.calculation'), icon: Zap },
    { value: '24/7', label: t('landing.stat.available'), icon: ShieldCheck },
  ];

  const features = [
    { icon: Zap, title: t('landing.instantQuotes'), desc: t('landing.instantQuotes.desc') },
    {
      icon: TrendingUp,
      title: t('landing.accurateBreakdown'),
      desc: t('landing.accurateBreakdown.desc'),
    },
    {
      icon: ShieldCheck,
      title: t('landing.verifiedCarriers'),
      desc: t('landing.verifiedCarriers.desc'),
    },
  ];

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200'>
      <Header />

      <main>
        {/* Hero */}
        <section className='relative overflow-hidden bg-gray-50 dark:bg-navy'>
          <InteractiveDotGrid />

          <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32'>
            <div className='grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] gap-14 lg:gap-16 items-center'>
              <div>
                <p className='inline-flex items-center gap-2 rounded-full border border-brand-blue-200 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-1 mb-8'>
                  <span aria-hidden='true' className='relative flex h-2 w-2'>
                    <span className='absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping motion-reduce:animate-none' />
                    <span className='relative inline-flex h-2 w-2 rounded-full bg-cyan-400' />
                  </span>
                  <span className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200'>
                    {t('landing.badge.networks')}
                  </span>
                </p>

                <h1 className='text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 dark:text-white leading-tight'>
                  {t('landing.title.main')}
                  <br />
                  <span className='text-brand-blue-600 dark:text-cyan-300'>
                    {t('landing.title.sub')}
                  </span>
                </h1>

                <p className='mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed'>
                  {t('landing.subtitle')}
                </p>

                {!isAuthenticated && (
                  <div className='mt-10 flex flex-col sm:flex-row gap-3'>
                    <Link
                      to='/signup'
                      className='group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-brand-blue hover:bg-brand-blue-600 text-white text-base font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 dark:focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-navy'
                    >
                      {t('landing.getStarted')}
                      <ArrowRight
                        aria-hidden='true'
                        className='w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none'
                      />
                    </Link>
                    <Link
                      to='/login'
                      className='inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-white text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 dark:focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-navy'
                    >
                      {t('nav.login')}
                    </Link>
                  </div>
                )}
              </div>

              <SampleQuoteCard t={t} />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className='border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'>
          <dl className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 divide-gray-200 dark:divide-gray-800 md:divide-x'>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className='flex flex-col-reverse gap-1 py-8 md:px-8 first:md:pl-0'
              >
                <dt className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                  <stat.icon aria-hidden='true' className='w-4 h-4 text-cyan-500' />
                  {stat.label}
                </dt>
                <dd className='text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums'>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Features */}
        <section className='py-20 sm:py-28'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='max-w-2xl mb-14'>
              <p className='text-sm font-semibold text-brand-blue-600 dark:text-brand-blue-300 uppercase tracking-wider mb-3'>
                {t('landing.featuresLabel')}
              </p>
              <h2 className='text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white'>
                {t('landing.featuresTitle')}
              </h2>
            </div>

            <ul className='grid md:grid-cols-3 gap-x-10 gap-y-12'>
              {features.map((feat) => (
                <li
                  key={feat.title}
                  className='border-t-2 border-gray-900 dark:border-gray-100 pt-6'
                >
                  <span className='inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-900/40 dark:text-brand-blue-300 mb-5'>
                    <feat.icon aria-hidden='true' className='w-5 h-5' />
                  </span>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                    {feat.title}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                    {feat.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      {/* The page had no footer at all — it ended on the third feature card with
          no company identity, no copyright and nowhere to go. The component
          already existed and its copy key is literally `landing.footer`; it was
          just never mounted here. It is also the only place the BridgeLogis name
          appears on screen. */}
      <Footer />
    </div>
  );
};
