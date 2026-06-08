import React from 'react';
import { QuoteInput, QuoteResult } from '@/types';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { WarningAlerts } from './WarningAlerts';
import { KeyMetricsGrid } from './KeyMetricsGrid';
import { CostBreakdownCard } from './CostBreakdownCard';
import { CarrierComparisonCard } from './CarrierComparisonCard';

interface Props {
  result: QuoteResult;
  input?: QuoteInput;
  onMarginChange: (newMargin: number) => void;
  onDownloadPdf: (currency?: 'krw' | 'usd') => void;
  onSwitchCarrier?: (carrier: 'UPS' | 'DHL') => void;
  marginPercent: number;
  hideMargin?: boolean;
  isKorean?: boolean;
}

export const ResultSection: React.FC<Props> = ({ result, input, onMarginChange, onDownloadPdf, onSwitchCarrier, marginPercent, hideMargin, isKorean = false }) => {
  return (
    <div className="space-y-6 sticky top-6">
      <QuoteSummaryCard result={result} onDownloadPdf={onDownloadPdf} isKorean={isKorean} hideMargin={hideMargin} />
      <WarningAlerts warnings={result.warnings} />
      <KeyMetricsGrid result={result} hideMargin={hideMargin} />

      {input && onSwitchCarrier && (
        <CarrierComparisonCard
          input={input}
          currentResult={result}
          isKorean={isKorean}
          onSwitchCarrier={onSwitchCarrier}
          hideMargin={hideMargin}
        />
      )}

      <CostBreakdownCard
        result={result}
        onMarginChange={onMarginChange}
        marginPercent={marginPercent}
        hideMargin={hideMargin}
        isKorean={isKorean}
      />
    </div>
  );
};