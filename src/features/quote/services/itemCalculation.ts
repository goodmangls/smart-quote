import { CargoItem, PackingType } from '@/types';
import {
  FUMIGATION_FEE,
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST,
} from '@/config/rates';
import { applyPackingDimensions } from '@/lib/packing-utils';

export interface ItemCalculationResult {
  totalActualWeight: number;
  totalPackedVolumetricWeight: number;
  totalBillableWeight: number;
  packingMaterialCost: number;
  packingLaborCost: number;
  warnings: string[];
}

export const calculateVolumetricWeight = (
  l: number,
  w: number,
  h: number,
  divisor: number = 5000,
) => {
  return (Math.ceil(l) * Math.ceil(w) * Math.ceil(h)) / divisor;
};

const roundToHalf = (weight: number): number => Math.ceil(weight * 2) / 2;

export const calculateItemCosts = (
  items: CargoItem[],
  packingType: PackingType,
  manualPackingCost?: number,
  volumetricDivisor: number = 5000,
): ItemCalculationResult => {
  let totalActualWeight = 0;
  let totalPackedVolumetricWeight = 0;
  let totalBillableWeight = 0;
  let packingMaterialCost = 0;
  let packingLaborCost = 0;
  const warnings: string[] = [];

  items.forEach((item) => {
    const packed = applyPackingDimensions(
      item.length,
      item.width,
      item.height,
      item.weight,
      packingType,
    );
    const { l, w, h, weight } = packed;

    if (packingType !== PackingType.NONE) {
      const surfaceAreaM2 = (2 * (l * w + l * h + w * h)) / 10000;
      packingMaterialCost += surfaceAreaM2 * PACKING_MATERIAL_BASE_COST * item.quantity;
      const laborPerItem =
        packingType === PackingType.VACUUM
          ? PACKING_LABOR_UNIT_COST * 1.5
          : PACKING_LABOR_UNIT_COST;
      packingLaborCost += laborPerItem * item.quantity;
    }

    const volWeight = calculateVolumetricWeight(l, w, h, volumetricDivisor);

    totalActualWeight += weight * item.quantity;
    totalPackedVolumetricWeight += volWeight * item.quantity;
    // Per-box chargeable weight: max(actual, volumetric), rounded up to 0.5kg,
    // accumulated per physical box for multi-box express billing.
    totalBillableWeight += roundToHalf(Math.max(weight, volWeight)) * item.quantity;
  });

  if (manualPackingCost !== undefined && manualPackingCost >= 0) {
    packingMaterialCost = manualPackingCost;
    packingLaborCost = 0;
  }

  return {
    totalActualWeight,
    totalPackedVolumetricWeight,
    totalBillableWeight,
    packingMaterialCost,
    packingLaborCost,
    warnings,
  };
};

export const computePackingTotal = (
  packingMaterialCost: number,
  packingLaborCost: number,
  packingType: PackingType,
  manualPackingCost?: number,
): { packingFumigationCost: number; packingTotal: number } => {
  let packingFumigationCost = packingType !== PackingType.NONE ? FUMIGATION_FEE : 0;

  if (manualPackingCost !== undefined && manualPackingCost >= 0) {
    packingFumigationCost = 0;
  }

  const packingTotal = packingMaterialCost + packingLaborCost + packingFumigationCost;
  return { packingFumigationCost, packingTotal };
};
