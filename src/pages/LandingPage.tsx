import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, ShieldCheck, ArrowRight, Globe, Truck, Plane, PackageCheck, Calculator } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const dotGridStyle: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = 'BridgeLogis — Global Express Freight Quoting Platform';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black">
          <div className="absolute inset-0 pointer-events-none" style={dotGridStyle} />
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 sm:pt-32 sm:pb-32 lg:pt-36 lg:pb-40">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] gap-14 lg:gap-20 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-cyan-100 tracking-wide">
                    {t('landing.badge.networks')}
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-tight">
                  {t('landing.title.main')}
                  <br />
                  <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                    {t('landing.title.sub')}
                  </span>
                </h1>

                <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  {t('landing.subtitle')}
                </p>

                {!isAuthenticated && (
                  <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link
                      to="/signup"
                      className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-base font-semibold rounded-2xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/30 transition-all duration-200"
                    >
                      {t('landing.getStarted')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-7 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-gray-100 text-base font-semibold rounded-2xl backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200"
                    >
                      {t('nav.login')}
                    </Link>
                  </div>
                )}
              </div>

              <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none" aria-label="Smart quote glass interface preview">
                <div className="absolute -inset-6 rounded-[2.5rem] bg-cyan-400/10 blur-3xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/[0.08] p-4 sm:p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl [box-shadow:0_24px_80px_rgba(8,145,178,0.18),inset_0_1px_0_rgba(255,255,255,0.22)]">
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/12 bg-black/25 px-4 py-3 text-white/80 backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                      <span className="text-xs font-semibold uppercase tracking-[0.22em]">Live Quote Desk</span>
                    </div>
                    <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-200/15">~3s</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/12 bg-white/[0.09] p-4 backdrop-blur-xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">Route</p>
                      <div className="mt-3 flex items-center gap-3 text-white">
                        <Plane className="h-5 w-5 text-cyan-200" />
                        <span className="text-sm font-semibold">{t('landing.mock.route')}</span>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/12 bg-white/[0.09] p-4 backdrop-blur-xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">Cargo</p>
                      <div className="mt-3 flex items-center gap-3 text-white">
                        <PackageCheck className="h-5 w-5 text-emerald-200" />
                        <span className="text-sm font-semibold">38 kg / 3 boxes</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.75rem] border border-white/15 bg-gray-950/45 p-4 sm:p-5 backdrop-blur-2xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/70">Best option</p>
                        <p className="mt-1 text-2xl font-extrabold text-white">DHL Express</p>
                      </div>
                      <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-100">
                        <Calculator className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        [t('landing.mock.freight'), '$386.20'],
                        [t('landing.mock.fsc'), '$96.20'],
                        ['Packing + handling', '$68.10'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-3 text-sm ring-1 ring-white/10">
                          <span className="text-gray-300">{label}</span>
                          <span className="font-semibold text-white">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3 rounded-3xl bg-gradient-to-r from-cyan-300/20 to-blue-400/12 px-5 py-4 ring-1 ring-cyan-100/15">
                      <div>
                        <p className="text-xs font-medium text-cyan-100/75">Estimated quote</p>
                        <p className="mt-1 text-3xl font-black tracking-tight text-white">$612</p>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-100 ring-1 ring-emerald-200/20">Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-gray-100 dark:bg-gray-900 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '2', label: t('landing.stat.carriers'), icon: Truck },
                { value: '190+', label: t('landing.stat.countries'), icon: Globe },
                { value: '~3s', label: t('landing.stat.calculation'), icon: Zap },
                { value: '24/7', label: t('landing.stat.available'), icon: ShieldCheck },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="w-8 h-8 text-cyan-500 mx-auto mb-3" />
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white block">{stat.value}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-3">{t('landing.featuresLabel')}</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                {t('landing.featuresTitle')}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  color: 'text-amber-500',
                  bg: 'bg-amber-500/10',
                  title: t('landing.instantQuotes'),
                  desc: t('landing.instantQuotes.desc'),
                },
                {
                  icon: TrendingUp,
                  color: 'text-cyan-500',
                  bg: 'bg-cyan-500/10',
                  title: t('landing.accurateBreakdown'),
                  desc: t('landing.accurateBreakdown.desc'),
                },
                {
                  icon: ShieldCheck,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-500/10',
                  title: t('landing.verifiedCarriers'),
                  desc: t('landing.verifiedCarriers.desc'),
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="group bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700 shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feat.bg} mb-6`}>
                    <feat.icon className={`w-6 h-6 ${feat.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
