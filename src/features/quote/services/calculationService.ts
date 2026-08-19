import { QuoteInput, QuoteResult, Incoterm, ShippingItemType } from '@/types';
import { computeQuotePricing } from './quotePricing';
import { computeSystemSurcharges } from './quoteSurcharges';
import { calculateDhlAddOnCosts } from './dhlAddonCalculator';
import { calculateUpsAddOnCosts } from './upsAddonCalculator';
import { calculateFedexAddOnCosts, getFedexMinChargeableWeight } from './fedexAddonCalculator';
import { calculateItemCosts, computePackingTotal } from './itemCalculation';
import { calculateUpsCosts } from './upsCalculation';
import { calculateDhlCosts } from './dhlCalculation';
import { calculateFedexCosts } from './fedexCalculation';
import { CarrierCostResult } from './carrierRateEngine';
import { getDocumentCapKg } from './documentCaps';

// Re-exports for backward compatibility (tests and other consumers import from here)
export { ZoneNotFoundError } from './zoneNotFoundError';
export { calculateVolumetricWeight, calculateItemCosts } from './itemCalculation';
export { calculateUpsCosts, determineUpsZone } from './upsCalculation';
export { calculateDhlCosts, determineDhlZone } from './dhlCalculation';
export { calculateFedexCosts, determineFedexZone } from './fedexCalculation';

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
  const rawBillableWeight =
    totalBoxCount >= 2
      ? itemResult.totalBillableWeight
      : Math.max(itemResult.totalActualWeight, itemResult.totalPackedVolumetricWeight);
  const userWarnings = [...itemResult.warnings];

  // FedEx rates a package meeting the 추가 취급 요금 – 용적 criteria at no less than
  // 18kg. The surcharge itself is flat, so this rule lands on the tariff lookup.
  // Null unless a package actually triggers it — the weight pipeline is otherwise untouched.
  const fedexMinChargeable =
    carrier === 'FEDEX' ? getFedexMinChargeableWeight(input.items, input.packingType) : null;
  const billableWeight =
    fedexMinChargeable !== null
      ? Math.max(rawBillableWeight, fedexMinChargeable)
      : rawBillableWeight;

  if (fedexMinChargeable !== null && billableWeight > rawBillableWeight) {
    userWarnings.push(
      `FedEx Minimum Chargeable Weight: rated at ${billableWeight}kg (actual ${rawBillableWeight}kg) — package meets the Additional Handling – Dimension criteria.`,
    );
  }

  if (itemResult.totalPackedVolumetricWeight > itemResult.totalActualWeight * 1.2) {
    userWarnings.push('High Volumetric Weight Detected (>20% over actual). Consider Repacking.');
  }

  // 3. Carrier Costs (routing by carrier)
  const shippingItemType = input.shippingItemType ?? ShippingItemType.NON_DOCUMENT;
  let carrierResult: CarrierCostResult;
  switch (carrier) {
    case 'DHL':
      carrierResult = calculateDhlCosts(billableWeight, input.destinationCountry, shippingItemType);
      break;
    case 'FEDEX':
      carrierResult = calculateFedexCosts(
        billableWeight,
        input.destinationCountry,
        shippingItemType,
      );
      break;
    default:
      carrierResult = calculateUpsCosts(billableWeight, input.destinationCountry, shippingItemType);
      break;
  }

  const docCapKg = getDocumentCapKg(carrier);
  const documentRatedAsParcel =
    shippingItemType === ShippingItemType.DOCUMENT && billableWeight > docCapKg;

  if (documentRatedAsParcel) {
    if (carrier === 'FEDEX') {
      userWarnings.push(
        `Document rates apply up to ${docCapKg}kg on FedEx (Envelope/Pak); IP Parcel tariff used for this weight.`,
      );
    } else {
      userWarnings.push(
        `Document rates apply up to ${docCapKg}kg on ${carrier}; Parcel tariff used for this weight.`,
      );
    }
  }

  // System surcharges from DB (War Risk, PSS, EBS, etc.)
  const manualSurgeCost = input.manualSurgeCost ?? 0;
  const { total: systemSurchargeTotal, applied: appliedSurcharges } = computeSystemSurcharges(
    input.resolvedSurcharges,
    carrierResult.intlBase,
  );

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
  } else if (carrier === 'FEDEX') {
    const fedexAddOns = calculateFedexAddOnCosts(input, billableWeight, input.fscPercent);
    carrierAddOnTotal = fedexAddOns.total;
    carrierAddOnDetails = fedexAddOns.details.length > 0 ? fedexAddOns.details : undefined;
  }

  // 4. Duty
  let destDuty = 0;
  if (input.incoterm === Incoterm.DDP) {
    destDuty = input.dutyTaxEstimate;
  }

  // 4a. Extra Pick-up in Seoul cost
  const pickupInSeoul = input.pickupInSeoulCost ?? 0;

  // 5. Pricing — base → margin → FSC → add-ons. See computeQuotePricing.
  const baseRate = carrierResult.intlBase;
  const {
    safeMarginPercent,
    marginAmount,
    quotedFsc: intlFscNew,
    totalCostAmount,
    totalQuoteAmount,
    totalQuoteAmountUSD,
  } = computeQuotePricing({
    baseRate,
    carrier,
    marginPercent: input.marginPercent,
    fscPercent: input.fscPercent,
    exchangeRate: input.exchangeRate,
    intlWarRisk: carrierResult.intlWarRisk,
    packingTotal,
    pickupInSeoul,
    surgeCost,
    carrierAddOnTotal,
    destDuty,
  });

  // Collect term handling
  if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
    userWarnings.push(
      'Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.',
    );
  }

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
    documentRatedAsParcel: documentRatedAsParcel || undefined,
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
