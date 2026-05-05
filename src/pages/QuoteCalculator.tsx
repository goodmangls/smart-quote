import React, { useState, useMemo, useEffect } from 'react';
import { QuoteInput, QuoteResult, QuoteDetail, Incoterm, PackingType } from '../types';
import { generatePDF } from '@/lib/pdfService';
import { calculateQuote } from '@/features/quote/services/calculationService';
import { trackEvent, IntercomEvents } from '@/lib/intercom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { QuoteHistoryPage } from '@/features/history/components/QuoteHistoryPage';
import { AppView } from '@/components/layout/NavigationTabs';
import { InputSection } from '@/features/quote/components/InputSection';
import { ResultSection } from '@/features/quote/components/ResultSection';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
} from '@/config/rates';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResolvedMargin } from '@/features/dashboard/hooks/useResolvedMargin';
import { useQuoteDeepLink } from '@/features/quote/hooks/useQuoteDeepLink';
import { CalculatorActionBar } from './components/CalculatorActionBar';
import { AdminWidgets } from './components/AdminWidgets';
import { Footer } from '@/components/layout/Footer';
import { MobileStickyBottomBar } from './components/MobileStickyBottomBar';

const INITIAL_INPUT: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '',
  shippingMode: 'Door-to-Door',
  incoterm: Incoterm.DAP,
  packingType: PackingType.NONE,
  items: [{ id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }],
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  fscPercent: DEFAULT_FSC_PERCENT,
  overseasCarrier: 'UPS',
  manualPackingCost: undefined,
};

const QuoteCalculator: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const [currentView, setCurrentView] = useState<AppView>('calculator');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const { isDarkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canSaveAndViewHistory = !!user;
  const hideMargin = isPublic || user?.role === 'member';
  const isKorean = user?.nationality === 'KR';

  // Phase 1.5 — apply /quote?origin=...&dest=...&weight=... deep-link prefill
  // exactly once on initial mount. UTM params (utm_source/medium/campaign) are
  // ignored here and read by GTM/GA4 directly for attribution.
  const deepLink = useQuoteDeepLink();
  const [input, setInput] = useState<QuoteInput>(() => ({
    ...INITIAL_INPUT,
    ...deepLink.partial,
  }));
  const [lastFscCarrier, setLastFscCarrier] = useState<string | null>(null);

  React.useEffect(() => {
    const carrier = input.overseasCarrier || 'UPS';
    if (lastFscCarrier !== carrier) {
      const carrierDefault = carrier === 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT;
      setInput((prev) => ({ ...prev, fscPercent: carrierDefault }));
      setLastFscCarrier(carrier);
    }
  }, [input.overseasCarrier, lastFscCarrier]);

  const result = useMemo<QuoteResult | null>(() => {
    try {
      return calculateQuote(input);
    } catch {
      return null;
    }
  }, [input]);

  // Debounced Intercom event: fire 2s after the user stops editing so the
  // operator side sees one event per real quote, not one per keystroke.
  // Deps are intentionally fine-grained (not the whole `result` object) so we
  // don't re-schedule on every unrelated recalc identity change.
  useEffect(() => {
    if (!result) return;
    const handle = window.setTimeout(() => {
      trackEvent(IntercomEvents.QuoteCalculated, {
        carrier: input.overseasCarrier,
        destination: input.destinationCountry,
        zone: result.appliedZone,
        billable_weight_kg: result.billableWeight,
        total_krw: result.totalQuoteAmount,
      });
    }, 2000);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    result?.totalQuoteAmount,
    result?.appliedZone,
    result?.billableWeight,
    input.overseasCarrier,
    input.destinationCountry,
  ]);

  const hasManuallyChangedMargin = React.useRef(false);
  const marginResolutionTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const { data: resolvedMargin } = useResolvedMargin(
    user?.email,
    user?.nationality,
    result?.billableWeight,
  );

  // Set default margin to 24% for admin once user role is known
  React.useEffect(() => {
    if (!isAdmin) return;
    if (hasManuallyChangedMargin.current) return;
    setInput((prev) => ({ ...prev, marginPercent: 24 }));
  }, [isAdmin]);

  React.useEffect(() => {
    if (!result || hasManuallyChangedMargin.current) return;
    if (isAdmin) return; // Admin sets margin freely — skip auto-resolution

    if (marginResolutionTimeout.current) clearTimeout(marginResolutionTimeout.current);

    marginResolutionTimeout.current = setTimeout(() => {
      let defaultMargin: number;

      if (resolvedMargin) {
        defaultMargin = resolvedMargin.marginPercent;
      } else {
        const weight = result.billableWeight;
        if (isKorean) {
          defaultMargin = weight >= 20 ? 19 : 24;
        } else {
          defaultMargin = weight >= 20 ? 24 : 32;
        }
      }

      if (input.marginPercent !== defaultMargin) {
        setInput((prev) => ({ ...prev, marginPercent: defaultMargin }));
      }
    }, 300);

    return () => {
      if (marginResolutionTimeout.current) clearTimeout(marginResolutionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally track only billableWeight, not entire result
  }, [
    result?.billableWeight,
    resolvedMargin,
    user?.nationality,
    user?.email,
    isKorean,
    input.marginPercent,
  ]);

  const handleMarginChange = (newMargin: number) => {
    hasManuallyChangedMargin.current = true;
    setInput((prev: QuoteInput) => ({ ...prev, marginPercent: newMargin }));
  };

  const handleDuplicate = (quote: QuoteDetail) => {
    const duplicatedInput: QuoteInput = {
      originCountry: quote.originCountry || 'KR',
      destinationCountry: quote.destinationCountry,
      destinationZip: quote.destinationZip || '',
      incoterm: (quote.incoterm as Incoterm) || Incoterm.DAP,
      packingType: (quote.packingType as PackingType) || PackingType.NONE,
      items: quote.items.map((item, i) => ({ ...item, id: String(i + 1) })),
      marginPercent: quote.marginPercent,
      dutyTaxEstimate: quote.dutyTaxEstimate,
      exchangeRate: quote.exchangeRate,
      fscPercent: quote.fscPercent,
      overseasCarrier: (quote.overseasCarrier as QuoteInput['overseasCarrier']) || 'UPS',
      shippingMode: 'Door-to-Door',
      manualPackingCost: quote.manualPackingCost ?? undefined,
    };
    setInput(duplicatedInput);
    hasManuallyChangedMargin.current = true;
    setCurrentView('calculator');
  };

  const handleReset = () => setShowResetConfirm(true);
  const handleDownloadPdf = async () =>
    result && (await generatePDF(input, result, undefined, { isAdmin, isKorean }));
  const handleQuoteSaved = () => setCurrentView('history');
  const scrollToResults = () =>
    document
      .getElementById('result-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const layoutProps = {
    isDarkMode,
    setIsDarkMode: (v: boolean) => {
      if (v !== isDarkMode) toggleDarkMode();
    },
    isMobileView,
    setIsMobileView,
    input,
    setInput,
    result,
    onMarginChange: handleMarginChange,
    onDownloadPdf: handleDownloadPdf,
    onReset: handleReset,
    scrollToResults,
    hideMargin,
    resolvedMargin,
    isAdmin,
    isKorean,
  };

  return (
    <div className='bg-gray-50 dark:bg-gray-950 min-h-screen font-sans transition-colors duration-200'>
      <Header />
      <CalculatorActionBar
        currentView={currentView}
        onViewChange={setCurrentView}
        canSaveAndViewHistory={canSaveAndViewHistory}
        input={input}
        result={result}
        onQuoteSaved={handleQuoteSaved}
        onReset={handleReset}
        isMobileView={isMobileView}
        onToggleMobileView={() => setIsMobileView(!isMobileView)}
      />

      {currentView === 'calculator' ? (
        <>
          {isMobileView ? (
            <MobileLayout {...layoutProps} />
          ) : (
            <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 lg:pb-8'>
              <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
                <div className='lg:col-span-7 space-y-8'>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                      {t('calc.shipmentConfig')}
                    </h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                      {t('calc.shipmentConfigDesc')}
                    </p>
                  </div>
                  <InputSection
                    input={input}
                    onChange={setInput}
                    isMobileView={false}
                    effectiveMarginPercent={result?.profitMargin}
                    hideMargin={hideMargin}
                    intlBase={result?.breakdown.intlBase}
                    billableWeight={result?.billableWeight}
                    resolvedMargin={resolvedMargin}
                  />
                  {isAdmin && <AdminWidgets />}
                </div>
                <div className='lg:col-span-5 lg:sticky top-24' id='result-section'>
                  {result && (
                    <ResultSection
                      result={result}
                      input={input}
                      hideMargin={hideMargin}
                      onMarginChange={handleMarginChange}
                      onDownloadPdf={handleDownloadPdf}
                      onSwitchCarrier={(carrier) =>
                        setInput((prev) => ({ ...prev, overseasCarrier: carrier }))
                      }
                      marginPercent={input.marginPercent}
                      isKorean={isKorean}
                    />
                  )}
                </div>
              </div>
            </main>
          )}
          {result && !isMobileView && (
            <MobileStickyBottomBar
              result={result}
              isKorean={isKorean}
              onViewDetails={scrollToResults}
            />
          )}
        </>
      ) : (
        <QuoteHistoryPage onDuplicate={handleDuplicate} />
      )}

      <div className='hidden lg:block'>
        <Footer />
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title={t('calc.resetTitle')}
        message={t('calc.resetMessage')}
        confirmLabel={t('calc.resetQuote')}
        variant='warning'
        onConfirm={() => {
          setShowResetConfirm(false);
          setInput(INITIAL_INPUT);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default QuoteCalculator;
