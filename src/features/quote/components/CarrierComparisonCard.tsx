import React, { useMemo, useState } from 'react';
import { QuoteInput, QuoteResult, CarrierComparisonItem, CarrierBadge } from '@/types';
import { calculateQuote } from '@/features/quote/services/calculationService';
import { assignBadges } from '@/features/quote/services/carrierRanker';
import { CARRIER_METADATA } from '@/config/carrier_metadata';
import { calculateCo2Kg } from '@/lib/co2';
import { DEFAULT_FSC_PERCENT, DEFAULT_FSC_PERCENT_DHL } from '@/config/rates';
import { formatKRW, formatUSDInt } from '@/lib/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRightLeft, Check, ArrowUpDown } from 'lucide-react';

interface Props {
  input: QuoteInput;
  currentResult: QuoteResult;
  isKorean?: boolean;
  onSwitchCarrier: (carrier: 'UPS' | 'DHL') => void;
  hideMargin?: boolean;
}

export const CarrierComparisonCard: React.FC<Props> = ({ input, currentResult, isKorean = false, onSwitchCarrier, hideMargin }) => {
  const { t } = useLanguage();
  const canToggleCurrency = !hideMargin || isKorean;
  const [showKRW, setShowKRW] = useState(!hideMargin || isKorean);
  const altCarrier = input.overseasCarrier === 'DHL' ? 'UPS' : 'DHL';

  const altResult = useMemo<QuoteResult | null>(() => {
    try {
      const altFsc = altCarrier === 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT;
      return calculateQuote({ ...input, overseasCarrier: altCarrier, fscPercent: altFsc });
    } catch {
      return null;
    }
  }, [input, altCarrier]);

  const currentCarrier = (input.overseasCarrier || 'UPS') as 'UPS' | 'DHL';

  // Build CarrierComparisonItem[] with badges (Phase 1.5)
  const badgedItems = useMemo<Record<string, CarrierComparisonItem> | null>(() => {
    if (!altResult) return null;
    const buildItem = (
      carrier: 'UPS' | 'DHL',
      result: QuoteResult
    ): CarrierComparisonItem => {
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
    const items = assignBadges([
      buildItem(currentCarrier, currentResult),
      buildItem(altCarrier as 'UPS' | 'DHL', altResult),
    ]);
    return {
      [items[0].carrier]: items[0],
      [items[1].carrier]: items[1],
    };
  }, [altResult, currentResult, currentCarrier, altCarrier, input.destinationCountry]);

  if (!altResult || !badgedItems) return null;

  const currentAmount = currentResult.totalQuoteAmount;
  const altAmount = altResult.totalQuoteAmount;
  const diff = altAmount - currentAmount;
  const diffPercent = currentAmount > 0 ? (diff / currentAmount) * 100 : 0;

  const carrierColors: Record<string, string> = {
    UPS: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    DHL: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-brand-blue-500" />
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            {t('comparison.title')}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {canToggleCurrency && (
            <button
              onClick={() => setShowKRW(prev => !prev)}
              className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 dark:hover:text-brand-blue-300 transition-colors"
              aria-label="Toggle currency"
              title="Toggle currency"
            >
              <ArrowUpDown className="w-3 h-3" />
              {showKRW ? 'KRW' : 'USD'}
            </button>
          )}
          {/* Comparison PDF hidden — use main PDF button instead */}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
        <CarrierColumn
          carrier={currentCarrier}
          result={currentResult}
          showKRW={showKRW}
          isCurrent={true}
          colorClass={carrierColors[currentCarrier] || ''}
          badges={badgedItems[currentCarrier]?.badges ?? []}
          transitDaysMin={CARRIER_METADATA[currentCarrier].transitDaysMin}
          transitDaysMax={CARRIER_METADATA[currentCarrier].transitDaysMax}
          co2Kg={badgedItems[currentCarrier]?.co2Kg ?? null}
          onSelect={() => {}}
        />
        <CarrierColumn
          carrier={altCarrier}
          result={altResult}
          showKRW={showKRW}
          isCurrent={false}
          colorClass={carrierColors[altCarrier] || ''}
          diff={diff}
          diffPercent={diffPercent}
          exchangeRate={input.exchangeRate}
          badges={badgedItems[altCarrier]?.badges ?? []}
          transitDaysMin={CARRIER_METADATA[altCarrier as 'UPS' | 'DHL'].transitDaysMin}
          transitDaysMax={CARRIER_METADATA[altCarrier as 'UPS' | 'DHL'].transitDaysMax}
          co2Kg={badgedItems[altCarrier]?.co2Kg ?? null}
          onSelect={() => onSwitchCarrier(altCarrier as 'UPS' | 'DHL')}
          hideSwitch={hideMargin}
        />
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

const BADGE_STYLE: Record<CarrierBadge, { icon: string; className: string; i18nKey: 'badge.cheapest' | 'badge.fastest' | 'badge.greenest' }> = {
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

const CarrierColumn: React.FC<CarrierColumnProps> = ({ carrier, result, showKRW, isCurrent, diff, diffPercent, exchangeRate = 1400, badges = [], transitDaysMin, transitDaysMax, co2Kg, onSelect, hideSwitch }) => {
  const { t } = useLanguage();
  const transitLabel =
    transitDaysMin !== undefined && transitDaysMax !== undefined
      ? t('transit.days')
          .replace('{min}', String(transitDaysMin))
          .replace('{max}', String(transitDaysMax))
      : result.transitTime;
  return (
    <div className={`p-4 ${isCurrent ? 'bg-brand-blue-50/50 dark:bg-brand-blue-900/10' : ''}`}>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {badges.map(b => {
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
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900 dark:text-white">{carrier}</span>
        {isCurrent ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-blue-600 dark:text-brand-blue-400 bg-brand-blue-100 dark:bg-brand-blue-900/30 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" /> Selected
          </span>
        ) : !hideSwitch ? (
          <button
            onClick={onSelect}
            className="text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 dark:hover:text-brand-blue-400 bg-gray-100 hover:bg-brand-blue-50 dark:bg-gray-700 dark:hover:bg-brand-blue-900/30 px-2 py-0.5 rounded-full transition-colors"
          >
            Switch
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Quote</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {showKRW ? formatKRW(result.totalQuoteAmount) : formatUSDInt(result.totalQuoteAmountUSD)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Zone</span>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{result.appliedZone}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Transit</span>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {transitLabel}
            </p>
          </div>
        </div>
        {co2Kg !== null && co2Kg !== undefined && (
          <div className="text-xs">
            <span className="text-gray-500 dark:text-gray-400">{t('co2.label')}</span>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {co2Kg.toFixed(1)} kg CO₂
            </p>
          </div>
        )}
        {!isCurrent && diff !== undefined && diffPercent !== undefined && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-md text-center ${
            diff < 0
              ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
              : diff > 0
                ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                : 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
          }`}>
            {diff < 0 ? '' : diff > 0 ? '+' : ''}{showKRW ? formatKRW(diff) : formatUSDInt(diff / exchangeRate)} ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
          </div>
        )}
      </div>
    </div>
  );
};
