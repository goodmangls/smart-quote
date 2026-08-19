import React, { useMemo, useState } from 'react';
import * as Sentry from '@sentry/browser';
import { QuoteInput, QuoteResult, CarrierComparisonItem, CarrierBadge } from '@/types';
import { calculateQuote, ZoneNotFoundError } from '@/features/quote/services/calculationService';
import { assignBadges } from '@/features/quote/services/carrierRanker';
import { CARRIER_METADATA } from '@/config/carrier_metadata';
import { calculateCo2Kg } from '@/lib/co2';
import {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
  DEFAULT_FSC_PERCENT_FEDEX,
} from '@/config/rates';
import { formatKRW, formatUSDInt } from '@/lib/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRightLeft, Check, ArrowUpDown } from 'lucide-react';

type QuoteCarrier = 'UPS' | 'DHL' | 'FEDEX';

const ALL_CARRIERS: QuoteCarrier[] = ['UPS', 'DHL', 'FEDEX'];

const defaultFscFor = (carrier: QuoteCarrier): number => {
  if (carrier === 'DHL') return DEFAULT_FSC_PERCENT_DHL;
  if (carrier === 'FEDEX') return DEFAULT_FSC_PERCENT_FEDEX;
  return DEFAULT_FSC_PERCENT;
};

// The comparison memo recalculates on every keystroke — report each distinct
// failure once per session so a broken rate table doesn't flood Sentry.
const reportedComparisonErrors = new Set<string>();

const reportComparisonError = (carrier: QuoteCarrier, error: unknown): void => {
  const key = `${carrier}:${error instanceof Error ? error.message : String(error)}`;
  if (reportedComparisonErrors.has(key)) return;
  reportedComparisonErrors.add(key);
  Sentry.captureException(error, {
    tags: { feature: 'carrier-comparison', carrier },
  });
};

interface Props {
  input: QuoteInput;
  currentResult: QuoteResult;
  isKorean?: boolean;
  onSwitchCarrier: (carrier: QuoteCarrier) => void;
  hideMargin?: boolean;
}

export const CarrierComparisonCard: React.FC<Props> = ({
  input,
  currentResult,
  onSwitchCarrier,
  hideMargin,
  isKorean = false,
}) => {
  const { t } = useLanguage();
  const canToggleCurrency = !hideMargin || isKorean;
  const [showKRW, setShowKRW] = useState(!hideMargin || isKorean);
  const currentCarrier = (input.overseasCarrier || 'UPS') as QuoteCarrier;

  const { resultsByCarrier, zoneUnavailable } = useMemo<{
    resultsByCarrier: Partial<Record<QuoteCarrier, QuoteResult>>;
    zoneUnavailable: ReadonlySet<QuoteCarrier>;
  }>(() => {
    const map: Partial<Record<QuoteCarrier, QuoteResult>> = {
      [currentCarrier]: currentResult,
    };
    const noZone = new Set<QuoteCarrier>();
    for (const carrier of ALL_CARRIERS) {
      if (carrier === currentCarrier) continue;
      try {
        map[carrier] = calculateQuote({
          ...input,
          overseasCarrier: carrier,
          fscPercent: defaultFscFor(carrier),
        });
      } catch (error) {
        // Destination without a zone for this carrier is an expected state:
        // the column renders a "no zone" notice instead of a price.
        if (error instanceof ZoneNotFoundError) {
          noZone.add(carrier);
          continue;
        }
        // Card degrades to the carriers that did calculate, but the failure
        // itself must surface — it usually means a corrupted rate table.
        reportComparisonError(carrier, error);
      }
    }
    return { resultsByCarrier: map, zoneUnavailable: noZone };
  }, [input, currentResult, currentCarrier]);

  const badgedItems = useMemo<Record<string, CarrierComparisonItem> | null>(() => {
    const buildItem = (carrier: QuoteCarrier, result: QuoteResult): CarrierComparisonItem => {
      const meta = CARRIER_METADATA[carrier];
      return {
        carrier,
        revenueKrw: result.totalQuoteAmount,
        costKrw: result.totalCostAmount,
        marginPct: result.profitMargin,
        transitDaysMin: meta.transitDaysMin,
        transitDaysMax: meta.transitDaysMax,
        co2Kg: calculateCo2Kg(carrier, result.billableWeight, input.destinationCountry),
        qualityScore: meta.qualityScore,
        badges: [],
      };
    };
    const items = ALL_CARRIERS.filter((c) => resultsByCarrier[c]).map((c) =>
      buildItem(c, resultsByCarrier[c]!),
    );
    if (items.length < 2) return null;
    const withBadges = assignBadges(items);
    return Object.fromEntries(withBadges.map((item) => [item.carrier, item]));
  }, [resultsByCarrier, input.destinationCountry]);

  // Nothing to compare and nothing to explain — hide the card entirely.
  if (!badgedItems && zoneUnavailable.size === 0) return null;

  const carrierColors: Record<string, string> = {
    UPS: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    DHL: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    FEDEX: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800',
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm'>
      <div className='px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <ArrowRightLeft className='w-4 h-4 text-brand-blue-500' />
          <h4 className='text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider'>
            {t('comparison.title')}
          </h4>
        </div>
        <div className='flex items-center gap-2'>
          {canToggleCurrency && (
            <button
              onClick={() => setShowKRW((prev) => !prev)}
              className='flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 dark:hover:text-brand-blue-300 transition-colors'
              aria-label='Toggle currency'
              title='Toggle currency'
            >
              <ArrowUpDown className='w-3 h-3' />
              {showKRW ? 'KRW' : 'USD'}
            </button>
          )}
        </div>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700'>
        {ALL_CARRIERS.map((carrier) => {
          const result = resultsByCarrier[carrier];
          if (!result) {
            if (!zoneUnavailable.has(carrier)) return null;
            return <NoZoneColumn key={carrier} carrier={carrier} />;
          }
          const isCurrent = carrier === currentCarrier;
          const diff = result.totalQuoteAmount - currentResult.totalQuoteAmount;
          const diffPercent =
            currentResult.totalQuoteAmount > 0 ? (diff / currentResult.totalQuoteAmount) * 100 : 0;
          return (
            <CarrierColumn
              key={carrier}
              carrier={carrier}
              result={result}
              showKRW={showKRW}
              isCurrent={isCurrent}
              colorClass={carrierColors[carrier] || ''}
              diff={isCurrent ? undefined : diff}
              diffPercent={isCurrent ? undefined : diffPercent}
              exchangeRate={input.exchangeRate}
              badges={badgedItems?.[carrier]?.badges ?? []}
              transitDaysMin={CARRIER_METADATA[carrier].transitDaysMin}
              transitDaysMax={CARRIER_METADATA[carrier].transitDaysMax}
              co2Kg={badgedItems?.[carrier]?.co2Kg ?? null}
              onSelect={() => onSwitchCarrier(carrier)}
              hideSwitch={hideMargin}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Column for a carrier whose zone table does not list the destination country.
 * Renders an explicit notice instead of hiding the carrier, so the user knows
 * why no price is offered.
 */
const NoZoneColumn: React.FC<{ carrier: string }> = ({ carrier }) => {
  const { t } = useLanguage();
  return (
    <div className='p-4'>
      <div className='min-h-[20px] mb-2' />
      <div className='flex items-center justify-between mb-3'>
        <span className='text-sm font-bold text-gray-400 dark:text-gray-500'>{carrier}</span>
      </div>
      <div className='rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10 px-3 py-4 text-center'>
        <p className='text-xs font-semibold text-amber-700 dark:text-amber-300'>
          {t('comparison.noZone')}
        </p>
      </div>
    </div>
  );
};

interface CarrierColumnProps {
  carrier: string;
  result: QuoteResult;
  showKRW: boolean;
  isCurrent: boolean;
  colorClass: string;
  diff?: number;
  diffPercent?: number;
  exchangeRate?: number;
  badges?: CarrierBadge[];
  transitDaysMin?: number;
  transitDaysMax?: number;
  co2Kg?: number | null;
  onSelect: () => void;
  hideSwitch?: boolean;
}

const BADGE_STYLE: Record<
  CarrierBadge,
  {
    icon: string;
    className: string;
    i18nKey: 'badge.cheapest' | 'badge.fastest' | 'badge.greenest';
  }
> = {
  cheapest: {
    icon: '💰',
    i18nKey: 'badge.cheapest',
    className: 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30',
  },
  fastest: {
    icon: '⚡',
    i18nKey: 'badge.fastest',
    className: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30',
  },
  greenest: {
    icon: '🌱',
    i18nKey: 'badge.greenest',
    className: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30',
  },
};

const CarrierColumn: React.FC<CarrierColumnProps> = ({
  carrier,
  result,
  showKRW,
  isCurrent,
  diff,
  diffPercent,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
  badges = [],
  transitDaysMin,
  transitDaysMax,
  co2Kg,
  onSelect,
  hideSwitch,
}) => {
  const { t } = useLanguage();
  const transitLabel =
    transitDaysMin !== undefined && transitDaysMax !== undefined
      ? t('transit.days')
          .replace('{min}', String(transitDaysMin))
          .replace('{max}', String(transitDaysMax))
      : result.transitTime;
  return (
    <div className={`p-4 ${isCurrent ? 'bg-brand-blue-50/50 dark:bg-brand-blue-900/10' : ''}`}>
      {/* min-h keeps the three columns vertically aligned even when a carrier wins no badge */}
      <div className='flex flex-wrap gap-1 mb-2 min-h-[20px]'>
        {badges.map((b) => {
          const cfg = BADGE_STYLE[b];
          const label = t(cfg.i18nKey);
          return (
            <span
              key={b}
              className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.className}`}
              title={label}
            >
              <span>{cfg.icon}</span>
              <span>{label}</span>
            </span>
          );
        })}
      </div>
      <div className='flex items-center justify-between mb-3'>
        <span className='text-sm font-bold text-gray-900 dark:text-white'>{carrier}</span>
        {isCurrent ? (
          <span className='flex items-center gap-1 text-[10px] font-semibold text-brand-blue-600 dark:text-brand-blue-400 bg-brand-blue-100 dark:bg-brand-blue-900/30 px-2 py-0.5 rounded-full'>
            <Check className='w-3 h-3' /> Selected
          </span>
        ) : !hideSwitch ? (
          <button
            onClick={onSelect}
            className='text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 dark:hover:text-brand-blue-400 bg-gray-100 hover:bg-brand-blue-50 dark:bg-gray-700 dark:hover:bg-brand-blue-900/30 px-2 py-0.5 rounded-full transition-colors'
          >
            Switch
          </button>
        ) : null}
      </div>
      <div className='space-y-2'>
        <div>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Total Quote</p>
          <p className='text-lg font-bold text-gray-900 dark:text-white'>
            {showKRW
              ? formatKRW(result.totalQuoteAmount)
              : formatUSDInt(result.totalQuoteAmountUSD)}
          </p>
        </div>
        {/* Zone / Transit / CO₂ stacked as label–value rows to avoid long zone labels colliding with transit text */}
        <div className='text-xs space-y-1'>
          <div className='flex items-baseline justify-between gap-2'>
            <span className='text-gray-500 dark:text-gray-400 shrink-0'>Zone</span>
            <p className='font-semibold text-gray-800 dark:text-gray-200 text-right'>
              {result.appliedZone}
            </p>
          </div>
          <div className='flex items-baseline justify-between gap-2'>
            <span className='text-gray-500 dark:text-gray-400 shrink-0'>Transit</span>
            <p className='font-semibold text-gray-800 dark:text-gray-200 text-right'>
              {transitLabel}
            </p>
          </div>
          {co2Kg !== null && co2Kg !== undefined && (
            <div className='flex items-baseline justify-between gap-2'>
              <span className='text-gray-500 dark:text-gray-400 shrink-0'>{t('co2.label')}</span>
              <p className='font-semibold text-gray-800 dark:text-gray-200 text-right'>
                {co2Kg.toFixed(1)} kg CO₂
              </p>
            </div>
          )}
        </div>
        {!isCurrent && diff !== undefined && diffPercent !== undefined && (
          <div
            className={`text-xs font-semibold px-2 py-1 rounded-md text-center ${
              diff < 0
                ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
                : diff > 0
                  ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                  : 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
            }`}
          >
            {diff < 0 ? '' : diff > 0 ? '+' : ''}
            {showKRW ? formatKRW(diff) : formatUSDInt(diff / exchangeRate)} (
            {diffPercent > 0 ? '+' : ''}
            {diffPercent.toFixed(1)}%)
          </div>
        )}
      </div>
    </div>
  );
};
