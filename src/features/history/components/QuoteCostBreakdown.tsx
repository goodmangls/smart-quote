import React from 'react';
import { QuoteDetail } from '@/types';
import { formatNum } from '@/lib/format';
import { Section, BreakdownRow } from './QuoteDetailSubcomponents';

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

  return (
    <Section title='Cost Breakdown'>
      <div className='space-y-1.5 text-sm'>
        <BreakdownRow label='Packing Material' value={breakdown.packingMaterial} />
        <BreakdownRow label='Packing Labor' value={breakdown.packingLabor} />
        <BreakdownRow label='Packing Fumigation' value={breakdown.packingFumigation} />
        <BreakdownRow label='Handling Fees' value={breakdown.handlingFees} />
        <BreakdownRow label='Intl. Base' value={breakdown.intlBase} />
        <BreakdownRow label='Intl. FSC' value={breakdown.intlFsc} />
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
              <BreakdownRow label='  Manual Surge' value={breakdown.intlManualSurge!} />
            )}
          </>
        ) : (
          <>
            <BreakdownRow label='Intl. War Risk' value={breakdown.intlWarRisk} />
            <BreakdownRow label='Intl. Surge' value={breakdown.intlSurge} />
          </>
        )}
        {breakdown.destDuty > 0 && (
          <BreakdownRow label='Dest Duty/Tax' value={breakdown.destDuty} />
        )}
        <div className='pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white'>
          <span>Total Cost</span>
          <span>{fmt(breakdown.totalCost)} KRW</span>
        </div>
      </div>
    </Section>
  );
};
