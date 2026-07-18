import React from 'react';
import { CargoItem, PackingType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { isDhlOversizePiece, isDhlOverWeight } from '@/config/dhl_addons';
import { normalizeDhlRates, calcAddonFee, type NormalizedRate } from '@/config/addon-utils';
import type { AddonRate } from '@/api/addonRateApi';
import { AlertTriangle, Shield } from 'lucide-react';
import { applyPackingDimensions } from '@/lib/packing-utils';
import { AddOnPanelShell } from './addon/AddOnPanelShell';
import { formatAddonUnitLabel, toggleAddonCode, totalCargoPieces } from './addon/addOnPanelHelpers';

interface Props {
  selectedAddOns: string[];
  onAddOnsChange: (codes: string[]) => void;
  declaredValue?: number;
  onDeclaredValueChange: (val: number | undefined) => void;
  items: CargoItem[];
  packingType: PackingType;
  billableWeight: number;
  fscPercent: number;
  isMobileView: boolean;
  dbRates?: AddonRate[];
}

/** DHL add-on UI — rates exclusively from normalizeDhlRates / dhl_addons (never UPS tables). */
export const DhlAddOnPanel: React.FC<Props> = ({
  selectedAddOns,
  onAddOnsChange,
  declaredValue,
  onDeclaredValueChange,
  items,
  packingType,
  billableWeight,
  fscPercent,
  isMobileView,
  dbRates,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Carrier-specific rate table (DHL only)
  const rates = React.useMemo(() => normalizeDhlRates(dbRates), [dbRates]);

  const autoDetected = React.useMemo(() => {
    const ospRate = rates.find((r) => r.code === 'OSP');
    const owtRate = rates.find((r) => r.code === 'OWT');
    const detected: { osp: number; owt: number } = { osp: 0, owt: 0 };

    items.forEach((item) => {
      const packed = applyPackingDimensions(
        item.length,
        item.width,
        item.height,
        item.weight,
        packingType,
      );
      const { l, w, h, weight } = packed;

      if (ospRate?.autoDetect) {
        const rules = ospRate.detectRules;
        const maxLongest = (rules?.max_longest as number) ?? 100;
        const maxSecond = (rules?.max_second as number) ?? 80;
        const sorted = [l, w, h].sort((a, b) => b - a);
        if (sorted[0] > maxLongest || sorted[1] > maxSecond) detected.osp += item.quantity;
      } else if (isDhlOversizePiece(l, w, h)) {
        detected.osp += item.quantity;
      }

      if (owtRate?.autoDetect) {
        const threshold = (owtRate.detectRules?.weight_threshold as number) ?? 70;
        if (weight > threshold) detected.owt += item.quantity;
      } else if (isDhlOverWeight(weight)) {
        detected.owt += item.quantity;
      }
    });
    return detected;
  }, [items, packingType, rates]);

  const selectableAddOns = rates.filter((a) => a.selectable);
  const fscRate = (fscPercent || 0) / 100;

  const getDisplayAmount = (code: string, rate: NormalizedRate): string => {
    if (code === 'RMT') return `${calcAddonFee(rate, billableWeight, 0).toLocaleString()}`;
    if (code === 'INS') {
      if (!declaredValue || declaredValue <= 0) {
        return `min ${(rate.minAmount ?? 17000).toLocaleString()}`;
      }
      return `${calcAddonFee(rate, 0, declaredValue).toLocaleString()}`;
    }
    if (code === 'IRR') {
      const totalPieces = totalCargoPieces(items);
      return `${(rate.amount * totalPieces).toLocaleString()} (${totalPieces}pcs)`;
    }
    return rate.amount.toLocaleString();
  };

  const totalSelected = React.useMemo(() => {
    let total = 0;

    selectedAddOns.forEach((code) => {
      const addon = rates.find((a) => a.code === code);
      if (!addon) return;
      let amount = addon.amount;

      if (addon.chargeType === 'calculated') {
        amount = calcAddonFee(addon, billableWeight, declaredValue || 0);
      } else if (code === 'IRR') {
        amount = addon.amount * totalCargoPieces(items);
      }

      const fsc = addon.fscApplicable ? amount * fscRate : 0;
      total += amount + fsc;
    });

    if (autoDetected.osp > 0) {
      const ospRate = rates.find((a) => a.code === 'OSP');
      if (ospRate) {
        const amt = ospRate.amount * autoDetected.osp;
        total += amt + (ospRate.fscApplicable ? amt * fscRate : 0);
      }
    }
    if (autoDetected.owt > 0) {
      const owtRate = rates.find((a) => a.code === 'OWT');
      if (owtRate) {
        const amt = owtRate.amount * autoDetected.owt;
        total += amt + (owtRate.fscApplicable ? amt * fscRate : 0);
      }
    }

    return total;
  }, [selectedAddOns, autoDetected, billableWeight, declaredValue, fscRate, items, rates]);

  const hasAutoNotices = autoDetected.osp > 0 || autoDetected.owt > 0;
  const notices = hasAutoNotices ? (
    <>
      {autoDetected.osp > 0 && (
        <div className='flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5'>
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
          <span>
            <b>Oversize Piece (OSP)</b> {isEn ? 'auto-detected' : '자동 감지'}: {autoDetected.osp}
            {isEn ? ' pcs' : '개'} —{' '}
            {(
              (rates.find((r) => r.code === 'OSP')?.amount ?? 30_000) * autoDetected.osp
            ).toLocaleString()}{' '}
            KRW (+FSC)
          </span>
        </div>
      )}
      {autoDetected.owt > 0 && (
        <div className='flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5'>
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
          <span>
            <b>Over Weight (&gt;70kg)</b> {isEn ? 'auto-detected' : '자동 감지'}: {autoDetected.owt}
            {isEn ? ' cartons' : '카톤'} —{' '}
            {(
              (rates.find((r) => r.code === 'OWT')?.amount ?? 150_000) * autoDetected.owt
            ).toLocaleString()}{' '}
            KRW (+FSC)
          </span>
        </div>
      )}
    </>
  ) : undefined;

  const insRate = rates.find((r) => r.code === 'INS');
  const footer = selectedAddOns.includes('INS') ? (
    <div className='mt-2 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2'>
      <Shield className='w-3.5 h-3.5 text-blue-500 shrink-0' />
      <label className='text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap'>
        {isEn ? 'Declared Value' : '물품 신고가'}:
      </label>
      <input
        type='number'
        value={declaredValue ?? ''}
        onChange={(e) =>
          onDeclaredValueChange(e.target.value === '' ? undefined : Number(e.target.value))
        }
        placeholder='KRW'
        className='flex-1 text-xs border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 p-0 tabular-nums'
        inputMode='numeric'
      />
      {declaredValue && declaredValue > 0 && insRate && (
        <span className='text-[10px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap'>
          = {calcAddonFee(insRate, 0, declaredValue).toLocaleString()} KRW
        </span>
      )}
    </div>
  ) : undefined;

  return (
    <AddOnPanelShell
      theme='dhl'
      title={`DHL ${isEn ? 'Add-on Services' : '부가서비스'}`}
      isMobileView={isMobileView}
      showDbBadge={Boolean(dbRates && dbRates.length > 0)}
      totalSelected={totalSelected}
      selectableAddOns={selectableAddOns}
      selectedAddOns={selectedAddOns}
      isEn={isEn}
      onToggle={(code) => onAddOnsChange(toggleAddonCode(selectedAddOns, code))}
      getDisplayAmount={getDisplayAmount}
      formatUnit={(unit) => formatAddonUnitLabel(unit, isEn)}
      notices={notices}
      footer={footer}
    />
  );
};
