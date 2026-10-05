import React, { useState, useEffect, useCallback, useId } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind, CloudDrizzle, ChevronLeft, ChevronRight, Plane, Ship, Pause, Play } from 'lucide-react';
import { usePortWeather } from '@/features/dashboard/hooks/usePortWeather';
import { WidgetSkeleton } from '@/features/dashboard/components/WidgetSkeleton';
import { WidgetError } from '@/features/dashboard/components/WidgetError';
import { PORTS_PER_PAGE } from '@/config/ports';
import type { PortWeather } from '@/types/dashboard';

const iconMap: Record<string, React.ReactNode> = {
  Sun: <Sun className="w-5 h-5 text-warning-500" />,
  Cloud: <Cloud className="w-5 h-5 text-gray-400" />,
  CloudRain: <CloudRain className="w-5 h-5 text-info-500" />,
  CloudDrizzle: <CloudDrizzle className="w-5 h-5 text-info-400" />,
  CloudSnow: <CloudSnow className="w-5 h-5 text-cyan-400" />,
  CloudLightning: <CloudLightning className="w-5 h-5 text-warning-600" />,
  CloudFog: <CloudFog className="w-5 h-5 text-gray-300" />,
  Wind: <Wind className="w-5 h-5 text-teal-400" />,
};

function getIcon(weather: PortWeather): React.ReactNode {
  const { condition } = weather;
  if (condition === 'Clear') return iconMap.Sun;
  if (condition === 'Cloudy') return iconMap.Cloud;
  if (condition === 'Rain') return iconMap.CloudRain;
  if (condition === 'Drizzle') return iconMap.CloudDrizzle;
  if (condition === 'Snow') return iconMap.CloudSnow;
  if (condition === 'Storm') return iconMap.CloudLightning;
  if (condition === 'Fog') return iconMap.CloudFog;
  if (condition === 'Windy') return iconMap.Wind;
  return iconMap.Cloud;
}

const statusBadge: Record<string, string> = {
  Normal: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  Delay: 'bg-destructive-100 text-destructive-700 dark:bg-destructive-900/30 dark:text-destructive-400',
  Warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
};

const AUTO_ROTATE_MS = 5000;

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const WeatherWidget: React.FC = () => {
  const { t } = useLanguage();
  const { data, loading, error, retry } = usePortWeather();
  const [currentPage, setCurrentPage] = useState(0);
  // WAI-ARIA APG Carousel + WCAG 2.2.2 (DESIGN.md §10.3): the user can stop rotation,
  // and it holds still while the pointer or keyboard focus is inside the widget.
  // Reduced motion starts stopped; the user can still opt in with the button.
  const [userPaused, setUserPaused] = useState(prefersReducedMotion);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const headingId = useId();

  const totalPages = Math.max(1, Math.ceil(data.length / PORTS_PER_PAGE));
  const needsPagination = data.length > PORTS_PER_PAGE;
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageData = data.slice(safePage * PORTS_PER_PAGE, (safePage + 1) * PORTS_PER_PAGE);

  const isCarousel = needsPagination && !loading && !error;
  const rotating = isCarousel && !userPaused && !hovered && !focusWithin;

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => {
      // A background tab should come back to the page the user left, not a random one.
      if (document.hidden) return;
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, totalPages]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  return (
    <section
      aria-labelledby={isCarousel ? headingId : undefined}
      aria-roledescription={isCarousel ? 'carousel' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
      }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200"
    >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm">
                <Sun aria-hidden="true" className="w-4 h-4 mr-2 text-brand-blue-500" />
                <span id={headingId}>{t('widget.weather')}</span>
            </h3>
            {isCarousel && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-400">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setUserPaused((prev) => !prev)}
                  aria-label={userPaused ? 'Start automatic rotation' : 'Stop automatic rotation'}
                  title={userPaused ? 'Start automatic rotation' : 'Stop automatic rotation'}
                  className={`p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors ${FOCUS_RING}`}
                >
                  {userPaused
                    ? <Play aria-hidden="true" className="w-3.5 h-3.5" />
                    : <Pause aria-hidden="true" className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
        </div>
        <div className="p-5">
            {loading && <WidgetSkeleton lines={6} />}
            {error && <WidgetError message={error} onRetry={retry} />}
            {!loading && !error && (
              <>
                <div aria-live={isCarousel ? (rotating ? 'off' : 'polite') : undefined}>
                <div
                  key={safePage}
                  role={isCarousel ? 'group' : undefined}
                  aria-roledescription={isCarousel ? 'slide' : undefined}
                  aria-label={isCarousel ? `${safePage + 1} of ${totalPages}` : undefined}
                  className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${isCarousel ? 'animate-enter-fade motion-reduce:animate-none' : ''}`}
                >
                    {pageData.map((weather) => (
                        <div key={weather.code} className="flex flex-col bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                  {weather.type === 'airport'
                                    ? <Plane className="w-5 h-5 text-cyan-500 shrink-0" />
                                    : <Ship className="w-5 h-5 text-info-500 shrink-0" />}
                                  {weather.port}
                                </span>
                                {getIcon(weather)}
                            </div>
                            <div className="flex justify-between items-end mt-1">
                                <span className="text-lg font-extrabold text-gray-900 dark:text-white">{weather.temperature}°C</span>
                                <span className={`text-xs sm:text-[10px] uppercase font-bold px-2 sm:px-1.5 py-1 sm:py-0.5 rounded ${statusBadge[weather.status] || statusBadge.Normal}`}>
                                    {weather.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
                {needsPagination && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={prevPage}
                      className={`p-2 sm:p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-400 transition-colors ${FOCUS_RING}`}
                      aria-label="Previous page"
                    >
                      <ChevronLeft aria-hidden="true" className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                    <div className="flex">
                      {Array.from({ length: totalPages }, (_, i) => (
                        // The visible dot is 8px; the padded button gives a 24px target (WCAG 2.5.8).
                        <button
                          key={i}
                          type="button"
                          onClick={() => goToPage(i)}
                          aria-label={`Page ${i + 1}`}
                          aria-current={i === safePage ? 'true' : undefined}
                          className={`group flex items-center justify-center min-w-6 h-6 px-1 rounded-full ${FOCUS_RING}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`block h-2 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none ${
                              i === safePage
                                ? 'w-4 bg-brand-blue-500'
                                : 'w-2 bg-gray-300 dark:bg-brand-blue-600 group-hover:bg-gray-400 dark:group-hover:bg-brand-blue-500'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={nextPage}
                      className={`p-2 sm:p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-400 transition-colors ${FOCUS_RING}`}
                      aria-label="Next page"
                    >
                      <ChevronRight aria-hidden="true" className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-3 text-center">
                    * {t('widget.weather.desc')}
                </p>
              </>
            )}
        </div>
    </section>
  );
};
