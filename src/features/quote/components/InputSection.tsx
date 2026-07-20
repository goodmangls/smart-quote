import React from 'react';
import { QuoteInput, CargoItem, ShippingItemType } from '@/types';
import { RouteSection } from './RouteSection';
import { FinancialSection } from './FinancialSection';
import { CargoSection } from './CargoSection';
import { ServiceSection } from './ServiceSection';
import { SeoulPickupSection } from './SeoulPickupSection';
import { FscRateWidget } from '@/features/admin/components/FscRateWidget';
import type { ResolvedMargin } from '@/api/marginRuleApi';

interface Props {
  input: QuoteInput;
  onChange: (newInput: QuoteInput) => void;
  isMobileView?: boolean;
  effectiveMarginPercent?: number;
  hideMargin?: boolean;
  intlBase?: number;
  billableWeight?: number;
  resolvedMargin?: ResolvedMargin | null;
}

export const InputSection: React.FC<Props> = ({ input, onChange, isMobileView = false, effectiveMarginPercent, hideMargin, intlBase, billableWeight, resolvedMargin }) => {

  const updateField = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => {
    onChange({ ...input, [key]: value });
  };

  const handleCargoChange = (newItems: CargoItem[]) => {
      updateField('items', newItems);
  };

  return (
    <div className="space-y-8">
      <RouteSection input={input} onFieldChange={updateField} isMobileView={isMobileView} />
      <CargoSection
        items={input.items}
        onChange={handleCargoChange}
        shippingItemType={input.shippingItemType ?? ShippingItemType.NON_DOCUMENT}
        onShippingItemTypeChange={(value) => updateField('shippingItemType', value)}
        onPackingTypeChange={(value) => updateField('packingType', value)}
        isMobileView={isMobileView}
        overseasCarrier={input.overseasCarrier}
      />
      <FscRateWidget readOnly={hideMargin} />
      {!hideMargin && (
        <FinancialSection input={input} onFieldChange={updateField} isMobileView={isMobileView} effectiveMarginPercent={effectiveMarginPercent} hideMargin={hideMargin} resolvedMargin={resolvedMargin} />
      )}
      <SeoulPickupSection input={input} onFieldChange={updateField} isMobileView={isMobileView} hideMargin={hideMargin} />
      <ServiceSection input={input} onFieldChange={updateField} isMobileView={isMobileView} intlBase={intlBase} billableWeight={billableWeight} hideMargin={hideMargin} />
    </div>
  );
};