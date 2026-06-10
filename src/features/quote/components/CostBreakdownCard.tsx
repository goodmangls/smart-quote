import React, { useState, useCallback } from 'react';
import { QuoteResult } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Calculator,
  Plane,
  TrendingUp,
  Info,
  Shield,
  Package,
  BoxSelect,
  PackageCheck,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import { formatKRW, formatUSD } from '@/lib/format';
import { resultStyles } from './result-styles';

interface Props {
  result: QuoteResult;
  onMarginChange: (newMargin: number) => void;
  marginPercent: number;
  hideMargin?: boolean;
  isKorean?: boolean;
}

export const CostBreakdownCard: React.FC<Props> = ({
  result,
  onMarginChange,
  marginPercent,
  hideMargin,
  isKorean = false,
}) => {
  const { cardClass } = resultStyles;
  const { language, t } = useLanguage();

  const localizeCarrierAddOnName = useCallback(
    (detail: { code: string; nameKo: string; nameEn: string }) => {
      if (language === 'ko') return detail.nameKo || detail.nameEn;

      if (detail.code === 'IHF') return t('quote.cost.addon.ihf');
      if (detail.code === 'SGF') {
        const regionMatch = detail.nameEn.match(/\(([^)]+)\)/);
        const region = regionMatch?.[1] ?? '';
        const translatedRegion =
          region === 'U.S. & Americas'
            ? t('quote.cost.region.usAmericas')
            : region === 'U.A.E. & Israel'
              ? t('quote.cost.region.uaeIsrael')
              : region === 'Middle East'
                ? t('quote.cost.region.middleEast')
                : region === 'Europe'
                  ? t('quote.cost.region.europe')
                  : region === 'Asia Pacific'
                    ? t('quote.cost.region.asiaPacific')
                    : region === 'Rest of World'
                      ? t('quote.cost.region.restOfWorld')
                      : region;
        return t('quote.cost.addon.sgf').replace('{region}', translatedRegion);
      }

      return detail.nameEn || detail.nameKo;
    },
    [language, t],
  );

  const localizeSurchargeName = useCallback(
    (surcharge: { name: string; nameKo?: string }) => (language === 'ko' ? surcharge.nameKo || surcharge.name : surcharge.name),
    [language],
  );

  // Admin (!hideMargin) and Korean account owner/member: KRW default + toggle.
  // Non-Korean account owner/member: USD-only.
  const canToggleCurrency = !hideMargin || isKorean;
  const [showKRW, setShowKRW] = useState(!hideMargin || isKorean);

  const exchangeRate =
    result.totalQuoteAmountUSD > 0 ? result.totalQuoteAmount / result.totalQuoteAmountUSD : 1400;

  const formatCurrency = useCallback(
    (val: number) => (showKRW ? formatKRW(val) : formatUSD(val / exchangeRate)),
    [showKRW, exchangeRate],
  );

  const baseRate = result.breakdown.intlBase;
  const marginAmount = result.profitAmount;
  const baseWithMargin = baseRate + marginAmount;
  const fscAmount = result.breakdown.intlFsc;
  const packingTotal =
    result.breakdown.packingMaterial +
    result.breakdown.packingLabor +
    result.breakdown.packingFumigation +
    result.breakdown.handlingFees;

  // Derive FSC% for display
  const fscPercent =
    baseWithMargin > 0 ? Math.round((fscAmount / baseWithMargin) * 10000) / 100 : 0;

  return (
    <div className={cardClass}>
      <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center transition-colors'>
        <h3 className='font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm'>
          <Calculator className='w-4 h-4 mr-2 text-brand-blue-500' />
          {t('quote.logisticsCost')}
        </h3>
        <div className='flex items-center gap-2'>
          {canToggleCurrency && (
            <button
              onClick={() => setShowKRW((prev) => !prev)}
              className='flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 dark:hover:text-brand-blue-300 transition-colors'
              aria-label='Toggle currency'
              title={t('quote.cost.toggleCurrency')}
            >
              <ArrowUpDown className='w-3 h-3' />
              {showKRW ? 'KRW' : 'USD'}
            </button>
          )}
          {!hideMargin && (
            <span className='text-[10px] font-bold px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300 uppercase tracking-wide'>
              {t('quote.cost.internal')}
            </span>
          )}
        </div>
      </div>

      <div className='p-5 space-y-6 text-sm'>
        {/* 1. Base Rate + Margin + FSC */}
        <div>
          <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3'>
            {t('quote.cost.freight')}
          </h4>
          <div className='space-y-3 pl-3 border-l-2 border-dashed border-gray-200 dark:border-gray-700'>
            {/* Base Rate — Member sees Base+Margin as "Base Rate" */}
            <div className='flex justify-between items-center text-gray-700 dark:text-gray-300'>
              <div className='flex items-center'>
                <Plane className='w-4 h-4 mr-2 text-gray-400 flex-shrink-0' />
                <span>{t('quote.cost.baseRate')}{!hideMargin ? ` (${result.carrier})` : ''}</span>
              </div>
              <span className='font-medium'>
                {formatCurrency(hideMargin ? baseWithMargin : baseRate)}
              </span>
            </div>

            {/* Margin (on Base Rate) */}
            {!hideMargin && (
              <div className='flex justify-between items-center text-green-700 dark:text-green-400'>
                <div className='flex items-center'>
                  <TrendingUp className='w-4 h-4 mr-2 flex-shrink-0' />
                  <span className='mr-2 font-medium'>{t('quote.margin')}</span>
                  <div className='relative rounded-md shadow-sm w-24'>
                    <input
                      type='number'
                      min='0'
                      step='0.1'
                      value={marginPercent}
                      onChange={(e) => onMarginChange(Number(e.target.value))}
                      className='focus:ring-brand-blue-500 focus:border-brand-blue-500 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-6 py-1 text-right font-bold'
                      inputMode='decimal'
                    />
                    <div className='pointer-events-none absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 text-xs'>
                      %
                    </div>
                  </div>
                </div>
                <span className='font-bold'>+ {formatCurrency(marginAmount)}</span>
              </div>
            )}

            {/* Subtotal: Base + Margin */}
            {!hideMargin && (
              <div className='flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pl-6'>
                <span>{t('quote.cost.subtotalBaseMargin')}</span>
                <span>{formatCurrency(baseWithMargin)}</span>
              </div>
            )}

            {/* FSC on (Base + Margin) */}
            {fscAmount > 0 && (
              <div className='flex justify-between items-center text-gray-700 dark:text-gray-300'>
                <div className='flex items-center pl-6'>
                  <span>FSC ({fscPercent}%)</span>
                </div>
                <span className='font-medium'>+ {formatCurrency(fscAmount)}</span>
              </div>
            )}
          </div>

          {/* Freight Subtotal */}
          <div className='flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 font-bold text-gray-800 dark:text-white'>
            <span className='pl-3'>{t('quote.cost.freightTotal')}</span>
            <span>{formatCurrency(baseWithMargin + fscAmount)}</span>
          </div>
        </div>

        {/* 2. Add-ons (separate from freight) */}
        {(packingTotal > 0 ||
          result.breakdown.pickupInSeoul > 0 ||
          result.breakdown.intlSurge > 0 ||
          (result.breakdown.carrierAddOnTotal ?? 0) > 0 ||
          result.breakdown.destDuty > 0) && (
          <div>
            <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3'>
              {t('quote.cost.addOns')}
            </h4>
            <div className='space-y-3 pl-3 border-l-2 border-dashed border-amber-200 dark:border-amber-700'>
              {/* Packing & Docs */}
              {packingTotal > 0 && (
                <div className='flex justify-between items-center text-gray-700 dark:text-gray-300'>
                  <div className='flex items-center'>
                    <PackageCheck className='w-4 h-4 mr-2 text-gray-400 flex-shrink-0' />
                    <span>{t('quote.cost.packingDocs')}</span>
                  </div>
                  <span className='font-medium'>{formatCurrency(packingTotal)}</span>
                </div>
              )}

              {/* Seoul Pickup */}
              {result.breakdown.pickupInSeoul > 0 && (
                <div className='flex justify-between items-center text-gray-700 dark:text-gray-300'>
                  <div className='flex items-center'>
                    <BoxSelect className='w-4 h-4 mr-2 text-gray-400 flex-shrink-0' />
                    <span>{t('quote.cost.seoulPickup')}</span>
                  </div>
                  <span className='font-medium'>
                    {formatCurrency(result.breakdown.pickupInSeoul)}
                  </span>
                </div>
              )}

              {/* Surcharges */}
              {result.breakdown.appliedSurcharges &&
                result.breakdown.appliedSurcharges.length > 0 &&
                result.breakdown.appliedSurcharges.map((s) => (
                  <div
                    key={s.code}
                    className='flex justify-between items-center text-amber-600 dark:text-amber-500'
                  >
                    <div className='flex items-center'>
                      <Shield className='w-4 h-4 mr-2 flex-shrink-0' />
                      <span>
                        {localizeSurchargeName(s)} {s.chargeType === 'rate' ? `(${s.amount}%)` : ''}
                      </span>
                    </div>
                    <span className='font-medium'>{formatCurrency(s.appliedAmount)}</span>
                  </div>
                ))}
              {(result.breakdown.intlManualSurge ?? 0) > 0 && (
                <div className='flex justify-between items-center text-amber-600 dark:text-amber-500'>
                  <div className='flex items-center'>
                    <BoxSelect className='w-4 h-4 mr-2 flex-shrink-0' />
                    <span>{t('quote.cost.manualSurge')}</span>
                  </div>
                  <span className='font-medium'>
                    {formatCurrency(result.breakdown.intlManualSurge!)}
                  </span>
                </div>
              )}

              {/* Carrier Add-ons */}
              {result.breakdown.carrierAddOnDetails &&
                result.breakdown.carrierAddOnDetails.length > 0 && (
                  <div className='flex flex-col space-y-1'>
                    <div className='flex justify-between items-center text-gray-700 dark:text-gray-300'>
                      <div className='flex items-center'>
                        <Package
                          className={`w-4 h-4 mr-2 flex-shrink-0 ${result.carrier === 'UPS' ? 'text-blue-500' : 'text-yellow-500'}`}
                        />
                        <span>{t('quote.cost.carrierAddOns').replace('{carrier}', result.carrier)}</span>
                      </div>
                      <span className='font-medium'>
                        {formatCurrency(result.breakdown.carrierAddOnTotal || 0)}
                      </span>
                    </div>
                    <div className='space-y-0.5 text-xs text-gray-500 dark:text-gray-400 pl-6'>
                      {result.breakdown.carrierAddOnDetails.map((d) => (
                        <div
                          key={d.code}
                          className={`flex justify-between ${result.carrier === 'UPS' ? 'text-blue-700 dark:text-blue-400' : 'text-yellow-700 dark:text-yellow-400'}`}
                        >
                          <span>
                            {localizeCarrierAddOnName(d)} ({d.code})
                          </span>
                          <span>
                            {formatCurrency(d.amount + d.fscAmount)}
                            {d.fscAmount > 0 ? ` ${t('quote.cost.plusFsc')}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* DDP Duty */}
              {result.breakdown.destDuty > 0 && (
                <div className='flex justify-between items-center text-gray-700 dark:text-gray-300'>
                  <div className='flex items-center pl-6'>
                    <span>{t('quote.cost.destinationDuty')}</span>
                  </div>
                  <span className='font-medium'>{formatCurrency(result.breakdown.destDuty)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Final Quote Price */}
        <div className='bg-brand-blue-50 dark:bg-brand-blue-900/20 p-4 rounded-xl border border-brand-blue-100 dark:border-brand-blue-800/30'>
          <div className='flex justify-between items-center'>
            <span className='text-brand-blue-900 dark:text-brand-blue-100 font-extrabold text-lg'>
              {t('quote.finalPrice')}
            </span>
            <div className='flex flex-col items-end'>
              <span className='text-brand-blue-900 dark:text-brand-blue-100 font-extrabold text-lg'>
                {showKRW
                  ? formatKRW(result.totalQuoteAmount)
                  : formatUSD(result.totalQuoteAmountUSD)}
              </span>
              {!hideMargin && (
                <span className='text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5'>
                  ({t('quote.approx')}{' '}
                  {showKRW
                    ? formatUSD(result.totalQuoteAmountUSD)
                    : formatKRW(result.totalQuoteAmount)}
                  )
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='bg-gray-50 dark:bg-gray-700/50 px-5 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-2 transition-colors'>
        <div className='flex items-start'>
          <Info className='w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-gray-400' />
          <p className='leading-relaxed'>{t('calc.costBasis.disclaimer')}</p>
        </div>
        {/* Customs & duties disclaimer is localized for the on-screen quote. */}
        <div className='flex items-start border-t border-gray-200 dark:border-gray-600 pt-2'>
          <AlertTriangle className='w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-gray-400' />
          <p className='leading-relaxed'>
            <span className='font-semibold text-gray-600 dark:text-gray-300'>
              {t('quote.disclaimer.customsTitle')}:{' '}
            </span>
            {t('quote.disclaimer.customsBody')}
          </p>
        </div>
      </div>
    </div>
  );
};
