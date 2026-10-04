import React from 'react';
import { QuoteDetail } from '@/types';
import { formatNum } from '@/lib/format';
import { Section, BreakdownRow } from './QuoteDetailSubcomponents';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  /**
   * Required, not `QuoteDetail['breakdown']` (now optional): the API withholds
   * the breakdown from members, and the caller gates on that. Keeping it
   * required here means a caller that forgets the guard fails to compile
   * instead of rendering an empty cost table.
   */
  breakdown: NonNullable<QuoteDetail['breakdown']>;
}

export const QuoteCostBreakdown: React.FC<Props> = ({ breakdown }) => {
  const fmt = formatNum;
  const { t } = useLanguage();

  return (
    <Section title={t('history.section.costBreakdown')}>
      <div className='space-y-1.5 text-sm'>
        <BreakdownRow label={t('history.cost.packingMaterial')} value={breakdown.packingMaterial} />
        <BreakdownRow label={t('history.cost.packingLabor')} value={breakdown.packingLabor} />
        <BreakdownRow label={t('history.cost.packingFumigation')} value={breakdown.packingFumigation} />
        <BreakdownRow label={t('history.cost.handlingFees')} value={breakdown.handlingFees} />
        <BreakdownRow label={t('history.cost.intlBase')} value={breakdown.intlBase} />
        <BreakdownRow label={t('history.cost.intlFsc')} value={breakdown.intlFsc} />
        {breakdown.appliedSurcharges && breakdown.appliedSurcharges.length > 0 ? (
          <>
            {breakdown.appliedSurcharges.map((s, i) => (
              <BreakdownRow
                key={i}
                label={`  ${s.nameKo || s.name}${s.chargeType === 'rate' ? ` (${s.amount}%)` : ''}`}
                value={s.appliedAmount}
              />
            ))}
            {(breakdown.intlManualSurge ?? 0) > 0 && (
              <BreakdownRow label={`  ${t('history.cost.manualSurge')}`} value={breakdown.intlManualSurge!} />
            )}
          </>
        ) : (
          <>
            <BreakdownRow label={t('history.cost.intlWarRisk')} value={breakdown.intlWarRisk} />
            <BreakdownRow label={t('history.cost.intlSurge')} value={breakdown.intlSurge} />
          </>
        )}
        {breakdown.destDuty > 0 && (
          <BreakdownRow label={t('history.cost.destDuty')} value={breakdown.destDuty} />
        )}
        <div className='pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white'>
          <span>{t('history.cost.totalCost')}</span>
          <span>{fmt(breakdown.totalCost)} KRW</span>
        </div>
      </div>
    </Section>
  );
};
