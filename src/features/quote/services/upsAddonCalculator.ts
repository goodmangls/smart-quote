/**
 * UPS Add-on Cost Calculator
 * Extracted from calculationService.ts for modularity.
 */
import type { QuoteInput } from "@/types";
import type { AddonRateLike } from "@/config/addon-utils";
import type { CarrierAddOnDetails } from "./dhlAddonCalculator";
import { calcAddonFee, findRate } from "@/config/addon-utils";
import {
  UPS_ADDON_RATES,
  isUpsAdditionalHandling,
  calculateUpsRemoteAreaFee,
  calculateUpsExtendedAreaFee,
  getUpsSurgeFeePerKg,
  UPS_INTERNATIONAL_PROCESSING_FEE_KRW,
} from "@/config/ups_addons";
import { Incoterm } from "@/types";
import { applyPackingDimensions } from "@/lib/packing-utils";

export const calculateUpsAddOnCosts = (
  input: QuoteInput,
  billableWeight: number,
  fscPercent: number
): { total: number; details: CarrierAddOnDetails } => {
  const fscRate = (fscPercent || 0) / 100;
  const details: CarrierAddOnDetails = [];
  let total = 0;

  // Use DB rates if available, otherwise hardcoded
  const dbRates = input.resolvedAddonRates?.filter(r => r.carrier === 'UPS');
  const useDb = dbRates && dbRates.length > 0;

  const findUpsRate = (code: string): AddonRateLike | null =>
    findRate(code, useDb ? dbRates : undefined, UPS_ADDON_RATES) ??
    (['IHF', 'SEF'].includes(code) ? findRate(code, undefined, UPS_ADDON_RATES) : null);

  // 1. Auto-detected: International Processing Fee (AWB당 고정 수수료)
  details.push({
    code: "IHF",
    nameKo: "국제 처리 수수료",
    nameEn: "International Processing Fee",
    amount: UPS_INTERNATIONAL_PROCESSING_FEE_KRW,
    fscAmount: 0,
  });
  total += UPS_INTERNATIONAL_PROCESSING_FEE_KRW;

  // 2. Auto-detected: AHS (Additional Handling)
  let ahsCount = 0;
  const ahsDef = findUpsRate("AHS");

  input.items.forEach((item) => {
    const packed = applyPackingDimensions(item.length, item.width, item.height, item.weight, input.packingType);
    const { l, w, h, weight } = packed;

    if (useDb && ahsDef?.detectRules) {
      const rules = ahsDef.detectRules;
      const wt = (rules.weight_threshold as number) ?? 25;
      const ml = (rules.max_longest as number) ?? 122;
      const ms = (rules.max_second as number) ?? 76;
      const pt = (rules.packing_types as string[]) ?? ['WOODEN_BOX', 'SKID'];
      const sorted = [l, w, h].sort((a, b) => b - a);
      if (weight > wt || sorted[0] > ml || sorted[1] > ms || pt.includes(input.packingType)) {
        ahsCount += item.quantity;
      }
    } else {
      if (isUpsAdditionalHandling(l, w, h, weight, input.packingType)) ahsCount += item.quantity;
    }
  });

  if (ahsCount > 0 && ahsDef) {
    const amount = ahsDef.amount * ahsCount;
    const fsc = ahsDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "AHS", nameKo: ahsDef.nameKo, nameEn: ahsDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }

  // 3. Auto-detected: DDP Service Fee
  if (input.incoterm === Incoterm.DDP) {
    const ddpDef = findUpsRate("DDP");
    if (ddpDef) {
      details.push({ code: "DDP", nameKo: ddpDef.nameKo, nameEn: ddpDef.nameEn, amount: ddpDef.amount, fscAmount: 0 });
      total += ddpDef.amount;
    }
  }

  // 4. Auto-detected: UPS Surge Emergency Fee — official destination-region table
  const surgeFeeInfo = getUpsSurgeFeePerKg(input.destinationCountry);
  if (surgeFeeInfo) {
    const surgeAmount = Math.ceil(billableWeight) * surgeFeeInfo.rate;
    const surgeFsc = surgeAmount * fscRate;
    details.push({
      code: "SGF",
      nameKo: `급증수수료 (${surgeFeeInfo.region})`,
      nameEn: `Surge Fee (${surgeFeeInfo.region})`,
      amount: surgeAmount,
      fscAmount: surgeFsc,
    });
    total += surgeAmount + surgeFsc;
  }

  // 5. User-selected add-ons
  const selectedCodes = input.upsAddOns || [];
  selectedCodes.forEach((code) => {
    // SEF is auto-detected by destination region; ignore stale/manual selections to avoid double charging.
    if (code === "SEF") return;
    const addon = findUpsRate(code);
    if (!addon) return;

    let amount: number;
    if (useDb) {
      amount = calcAddonFee(addon, billableWeight, 0);
      if (code === "ADC" && addon.chargeType === 'per_carton') {
        const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }
    } else {
      amount = addon.amount;
      if (code === "RMT") amount = calculateUpsRemoteAreaFee(billableWeight);
      if (code === "EXT") amount = calculateUpsExtendedAreaFee(billableWeight);
      if (code === "ADC") {
        const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }
    }

    const fsc = addon.fscApplicable ? amount * fscRate : 0;
    details.push({ code, nameKo: addon.nameKo, nameEn: addon.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  });

  return { total, details };
};
