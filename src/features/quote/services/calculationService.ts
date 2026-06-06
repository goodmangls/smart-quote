import { QuoteInput, QuoteResult, Incoterm } from '@/types';
import {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
} from '@/config/rates';
import { MAX_MARGIN_PERCENT } from '@/config/business-rules';
import { calculateDhlAddOnCosts } from './dhlAddonCalculator';
import { calculateUpsAddOnCosts } from './upsAddonCalculator';
import { calculateItemCosts, computePackingTotal } from './itemCalculation';
import { calculateUpsCosts } from './upsCalculation';
import { calculateDhlCosts } from './dhlCalculation';
import { CarrierCostResult } from './carrierRateEngine';

// Re-exports for backward compatibility (tests and other consumers import from here)
export { calculateVolumetricWeight, calculateItemCosts } from './itemCalculation';
export { calculateUpsCosts, determineUpsZone } from './upsCalculation';
export { calculateDhlCosts, determineDhlZone } from './dhlCalculation';

export const calculateQuote = (input: QuoteInput): QuoteResult => {
  const carrier = input.overseasCarrier || 'UPS';
  const volumetricDivisor = 5000;

  // 1. Calculate Item Costs (Packing, Surge, Weights)
  const itemResult = calculateItemCosts(
    input.items,
    input.packingType,
    input.manualPackingCost,
    volumetricDivisor,
  );

  const { packingFumigationCost, packingTotal } = computePackingTotal(
    itemResult.packingMaterialCost,
    itemResult.packingLaborCost,
    input.packingType,
    input.manualPackingCost,
  );

  // 2. Billable Weight
  // Global express billing (UPS/DHL): for multi-box shipments (2+ physical boxes),
  // calculate each box's chargeable weight independently, round each box up to
  // the 0.5kg rating increment, then sum. A single box keeps the legacy raw
  // max-of-totals behavior unchanged.
  const totalBoxCount = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const billableWeight =
    totalBoxCount >= 2
      ? itemResult.totalBillableWeight
      : Math.max(itemResult.totalActualWeight, itemResult.totalPackedVolumetricWeight);
  const userWarnings = [...itemResult.warnings];

  if (itemResult.totalPackedVolumetricWeight > itemResult.totalActualWeight * 1.2) {
    userWarnings.push('High Volumetric Weight Detected (>20% over actual). Consider Repacking.');
  }

  // 3. Carrier Costs (routing by carrier)
  let carrierResult: CarrierCostResult;
  switch (carrier) {
    case 'DHL':
      carrierResult = calculateDhlCosts(billableWeight, input.destinationCountry);
      break;
    default:
      carrierResult = calculateUpsCosts(billableWeight, input.destinationCountry);
      break;
  }

  // System surcharges from DB (War Risk, PSS, EBS, etc.)
  const manualSurgeCost = input.manualSurgeCost ?? 0;
  let systemSurchargeTotal = 0;
  let appliedSurcharges:
    | NonNullable<import('@/types').CostBreakdown['appliedSurcharges']>
    | undefined;

  if (input.resolvedSurcharges && input.resolvedSurcharges.length > 0) {
    const applied = input.resolvedSurcharges.map((s) => {
      const appliedAmount =
        s.chargeType === 'rate'
          ? Math.round((carrierResult.intlBase * s.amount) / 100)
          : Math.round(s.amount);
      return {
        code: s.code,
        name: s.name,
        nameKo: s.nameKo ?? undefined,
        chargeType: s.chargeType,
        amount: s.amount,
        appliedAmount,
        sourceUrl: s.sourceUrl ?? undefined,
      };
    });
    systemSurchargeTotal = applied.reduce((sum, s) => sum + s.appliedAmount, 0);
    appliedSurcharges = applied;
  }

  const surgeCost = systemSurchargeTotal + manualSurgeCost;

  // 3a. Carrier Add-on Services (DHL or UPS)
  let carrierAddOnTotal = 0;
  let carrierAddOnDetails:
    | NonNullable<import('@/types').CostBreakdown['carrierAddOnDetails']>
    | undefined;
  if (carrier === 'DHL') {
    const dhlAddOns = calculateDhlAddOnCosts(input, billableWeight, input.fscPercent);
    carrierAddOnTotal = dhlAddOns.total;
    carrierAddOnDetails = dhlAddOns.details.length > 0 ? dhlAddOns.details : undefined;
  } else if (carrier === 'UPS') {
    const upsAddOns = calculateUpsAddOnCosts(input, billableWeight, input.fscPercent);
    carrierAddOnTotal = upsAddOns.total;
    carrierAddOnDetails = upsAddOns.details.length > 0 ? upsAddOns.details : undefined;
  }

  // 4. Duty
  let destDuty = 0;
  if (input.incoterm === Incoterm.DDP) {
    destDuty = input.dutyTaxEstimate;
  }

  // 4a. Extra Pick-up in Seoul cost
  const pickupInSeoul = input.pickupInSeoulCost ?? 0;

  // 5. New Calculation Structure:
  //    Step 1: Base Rate (carrier tariff)
  //    Step 2: + Margin (on Base Rate only)
  //    Step 3: + FSC ((Base Rate + Margin) × FSC%)
  //    Step 4: + Add-ons (Packing, Seoul Pickup, Surcharges, Carrier Add-ons, Duty)
  //    = Final Quote

  const exchangeRate = input.exchangeRate || DEFAULT_EXCHANGE_RATE;
  const safeMarginPercent = Math.min(Math.max(input.marginPercent ?? 15, 0), MAX_MARGIN_PERCENT);
  const baseRate = carrierResult.intlBase;

  // Step 2: Markup on Base Rate (cost × (1 + margin%))
  const baseWithMargin = baseRate * (1 + safeMarginPercent / 100);
  const marginAmount = baseWithMargin - baseRate;

  // Step 3: FSC on (Base Rate + Margin)
  const defaultFsc = carrier === 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT;
  const fscRate = (input.fscPercent || defaultFsc) / 100;
  const intlFscNew = Math.round(baseWithMargin * fscRate);

  // Step 4: Add-ons (no margin applied)
  const addOnTotal =
    packingTotal +
    pickupInSeoul +
    surgeCost +
    carrierAddOnTotal +
    destDuty +
    carrierResult.intlWarRisk;

  // Collect term handling
  if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
    userWarnings.push(
      'Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.',
    );
  }

  // Final totals — costFsc is the actual FSC cost (without margin) paid to carrier
  const costFsc = Math.round(baseRate * fscRate);
  const totalCostAmount =
    baseRate +
    costFsc +
    carrierResult.intlWarRisk +
    surgeCost +
    packingTotal +
    carrierAddOnTotal +
    destDuty +
    pickupInSeoul;
  const rawQuoteAmount = baseWithMargin + intlFscNew + addOnTotal;
  const totalQuoteAmount = Math.ceil(rawQuoteAmount / 100) * 100; // Round up to nearest 100 KRW
  const totalQuoteAmountUSD = totalQuoteAmount / exchangeRate;

  if (safeMarginPercent < 10) {
    userWarnings.push('Low Margin Alert: Profit margin is below 10%. Approval required.');
  }

  return {
    totalQuoteAmount,
    totalQuoteAmountUSD,
    totalCostAmount,
    profitAmount: marginAmount,
    profitMargin: Math.round(safeMarginPercent * 100) / 100,
    currency: 'KRW',
    totalActualWeight: itemResult.totalActualWeight,
    totalVolumetricWeight: itemResult.totalPackedVolumetricWeight,
    billableWeight,
    appliedZone: carrierResult.appliedZone,
    transitTime: carrierResult.transitTime,
    carrier,
    warnings: userWarnings,
    breakdown: {
      packingMaterial: itemResult.packingMaterialCost,
      packingLabor: itemResult.packingLaborCost,
      packingFumigation: packingFumigationCost,
      handlingFees: 0,
      pickupInSeoul,
      intlBase: baseRate,
      intlFsc: intlFscNew,
      intlWarRisk: carrierResult.intlWarRisk,
      intlSurge: surgeCost,
      intlSystemSurcharge: systemSurchargeTotal || undefined,
      intlManualSurge: manualSurgeCost || undefined,
      appliedSurcharges,
      carrierAddOnTotal: carrierAddOnTotal || undefined,
      carrierAddOnDetails: carrierAddOnDetails,
      destDuty,
      totalCost: totalCostAmount,
    },
  };
};
