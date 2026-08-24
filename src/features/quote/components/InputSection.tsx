import React from 'react';
import { QuoteInput, CargoItem, ShippingItemType, PackingType } from '@/types';
import { RouteSection } from './RouteSection';
import { FinancialSection } from './FinancialSection';
import { CargoSection } from './CargoSection';
import { ServiceSection } from './ServiceSection';
import { SeoulPickupSection } from './SeoulPickupSection';
import { FscRateWidget } from '@/features/admin/components/FscRateWidget';
import type { ResolvedMargin } from '@/api/marginRuleApi';
import { DOCUMENT_ENVELOPE_DIMS_CM } from './documentEnvelope';

interface Props {
  input: QuoteInput;
  onChange: (newInput: QuoteInput) => void;
  isMobileView?: boolean;
  effectiveMarginPercent?: number;
  hideMargin?: boolean;
  intlBase?: number;
  billableWeight?: number;
  resolvedMargin?: ResolvedMargin | null;
  /** DB-resolved FSC for the selected carrier; see useCarrierFscDefault. */
  carrierFscDefault?: number;
}

export const InputSection: React.FC<Props> = ({ input, onChange, isMobileView = false, effectiveMarginPercent, hideMargin, intlBase, billableWeight, resolvedMargin, carrierFscDefault }) => {

  const updateField = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => {
    onChange({ ...input, [key]: value });
  };

  const handleCargoChange = (newItems: CargoItem[]) => {
      updateField('items', newItems);
  };

  /** 단일 onChange로 shippingItemType(+ Document 시 packing/치수)을 원자적으로 반영 */
  const handleShippingItemTypeChange = (value: ShippingItemType) => {
    if (value === ShippingItemType.DOCUMENT) {
      onChange({
        ...input,
        shippingItemType: value,
        packingType: PackingType.NONE,
        items: input.items.map((item) => ({
          ...item,
          length: DOCUMENT_ENVELOPE_DIMS_CM.length,
          width: DOCUMENT_ENVELOPE_DIMS_CM.width,
          height: DOCUMENT_ENVELOPE_DIMS_CM.height,
        })),
      });
      return;
    }
    updateField('shippingItemType', value);
  };

  return (
    <div className="space-y-8">
      <RouteSection input={input} onFieldChange={updateField} isMobileView={isMobileView} />
      <CargoSection
        items={input.items}
        onChange={handleCargoChange}
        shippingItemType={input.shippingItemType ?? ShippingItemType.NON_DOCUMENT}
        onShippingItemTypeChange={handleShippingItemTypeChange}
        isMobileView={isMobileView}
        overseasCarrier={input.overseasCarrier}
      />
      <FscRateWidget readOnly={hideMargin} />
      {!hideMargin && (
        <FinancialSection input={input} onFieldChange={updateField} isMobileView={isMobileView} effectiveMarginPercent={effectiveMarginPercent} hideMargin={hideMargin} resolvedMargin={resolvedMargin} carrierFscDefault={carrierFscDefault} />
      )}
      <SeoulPickupSection input={input} onFieldChange={updateField} isMobileView={isMobileView} hideMargin={hideMargin} />
      <ServiceSection input={input} onFieldChange={updateField} isMobileView={isMobileView} intlBase={intlBase} billableWeight={billableWeight} hideMargin={hideMargin} />
    </div>
  );
};
