import React from 'react';
import { CargoItem, PackingType, Incoterm } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isUpsAdditionalHandling,
  UPS_INTERNATIONAL_PROCESSING_FEE_KRW,
  getUpsSurgeFeePerKg,
} from '@/config/ups_addons';
import { normalizeUpsRates, calcAddonFee, type NormalizedRate } from '@/config/addon-utils';
import type { AddonRate } from '@/api/addonRateApi';
import { AlertTriangle, Info, MapPin } from 'lucide-react';
import { lookupEasSurcharge, preloadEasData, type EasSurchargeType } from '@/config/ups_eas_lookup';
import { applyPackingDimensions } from '@/lib/packing-utils';
import { AddOnPanelShell } from './addon/AddOnPanelShell';
import { formatAddonUnitLabel, toggleAddonCode, totalCargoPieces } from './addon/addOnPanelHelpers';

interface Props {
  selectedAddOns: string[];
  onAddOnsChange: (codes: string[]) => void;
  items: CargoItem[];
  packingType: PackingType;
  billableWeight: number;
  fscPercent: number;
  isMobileView: boolean;
  incoterm: string;
  dbRates?: AddonRate[];
  destinationCountry?: string;
  destinationZip?: string;
}

/** UPS add-on UI — rates exclusively from normalizeUpsRates / ups_addons (never DHL tables). */
export const UpsAddOnPanel: React.FC<Props> = ({
  selectedAddOns,
  onAddOnsChange,
  items,
  packingType,
  billableWeight,
  fscPercent,
  isMobileView,
  incoterm,
  dbRates,
  destinationCountry,
  destinationZip,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Carrier-specific rate table (UPS only)
  const rates = React.useMemo(() => normalizeUpsRates(dbRates), [dbRates]);

  const [detectedEas, setDetectedEas] = React.useState<EasSurchargeType>(null);

  React.useEffect(() => {
    preloadEasData();
  }, []);

  React.useEffect(() => {
    if (!destinationCountry || !destinationZip || destinationZip.length < 2) {
      setDetectedEas(null);
      return;
    }
    let cancelled = false;
    lookupEasSurcharge(destinationCountry, destinationZip).then((result) => {
      if (!cancelled) setDetectedEas(result);
    });
    return () => {
      cancelled = true;
    };
  }, [destinationCountry, destinationZip]);

  const ahsCount = React.useMemo(() => {
    const ahsRate = rates.find((r) => r.code === 'AHS');
    let count = 0;
    items.forEach((item) => {
      const packed = applyPackingDimensions(
        item.length,
        item.width,
        item.height,
        item.weight,
        packingType,
      );
      const { l, w, h, weight } = packed;

      if (ahsRate?.autoDetect && ahsRate.detectRules) {
        const wt = (ahsRate.detectRules.weight_threshold as number) ?? 25;
        const ml = (ahsRate.detectRules.max_longest as number) ?? 122;
        const ms = (ahsRate.detectRules.max_second as number) ?? 76;
        const pt = (ahsRate.detectRules.packing_types as string[]) ?? ['WOODEN_BOX', 'SKID'];
        const sorted = [l, w, h].sort((a, b) => b - a);
        if (weight > wt || sorted[0] > ml || sorted[1] > ms || pt.includes(packingType)) {
          count += item.quantity;
        }
      } else if (isUpsAdditionalHandling(l, w, h, weight, packingType)) {
        count += item.quantity;
      }
    });
    return count;
  }, [items, packingType, rates]);

  const isDDP = incoterm === Incoterm.DDP;
  const surgeFeeInfo = React.useMemo(
    () => getUpsSurgeFeePerKg(destinationCountry || ''),
    [destinationCountry],
  );

  const selectableAddOns = rates.filter((a) => a.selectable);
  const fscRate = (fscPercent || 0) / 100;

  const getDisplayAmount = (code: string, rate: NormalizedRate): string => {
    if (code === 'RMT' || code === 'EXT' || code === 'SEF') {
      return `${calcAddonFee(rate, billableWeight, 0).toLocaleString()}`;
    }
    if (code === 'ADC') {
      const totalCartons = totalCargoPieces(items);
      return `${(rate.amount * totalCartons).toLocaleString()} (${totalCartons}${isEn ? 'pcs' : '카톤'})`;
    }
    return rate.amount.toLocaleString();
  };

  const totalSelected = React.useMemo(() => {
    let total = UPS_INTERNATIONAL_PROCESSING_FEE_KRW;

    selectedAddOns.forEach((code) => {
      // SEF is auto-detected from destination; ignore stale/manual selections to avoid double charging.
      if (code === 'SEF') return;
      const addon = rates.find((a) => a.code === code);
      if (!addon) return;
      let amount = addon.amount;

      if (addon.chargeType === 'calculated') {
        amount = calcAddonFee(addon, billableWeight, 0);
      } else if (code === 'ADC') {
        amount = addon.amount * totalCargoPieces(items);
      }

      const fsc = addon.fscApplicable ? amount * fscRate : 0;
      total += amount + fsc;
    });

    if (ahsCount > 0) {
      const ahsRate = rates.find((a) => a.code === 'AHS');
      if (ahsRate) {
        const amt = ahsRate.amount * ahsCount;
        total += amt + (ahsRate.fscApplicable ? amt * fscRate : 0);
      }
    }

    if (isDDP) {
      const ddpRate = rates.find((a) => a.code === 'DDP');
      if (ddpRate) total += ddpRate.amount;
    }

    if (surgeFeeInfo) {
      const amount = Math.ceil(billableWeight) * surgeFeeInfo.rate;
      total += amount + amount * fscRate;
    }

    return total;
  }, [selectedAddOns, ahsCount, isDDP, surgeFeeInfo, billableWeight, fscRate, items, rates]);

  const notices = (
    <>
      <div className='flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5'>
        <Info className='w-3.5 h-3.5 shrink-0' />
        <span>
          <b>{isEn ? 'International Processing Fee' : '국제 처리 수수료'}</b>{' '}
          {isEn ? 'auto-applied per UPS AWB' : 'UPS AWB 건당 자동 적용'}:{' '}
          {UPS_INTERNATIONAL_PROCESSING_FEE_KRW.toLocaleString()} KRW
        </span>
      </div>

      {surgeFeeInfo && (
        <div className='flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2.5 py-1.5'>
          <Info className='w-3.5 h-3.5 shrink-0' />
          <span>
            <b>
              {isEn
                ? `Surge Emergency Fee (${surgeFeeInfo.region})`
                : `급증 긴급 수수료 (${surgeFeeInfo.region})`}
            </b>{' '}
            {isEn ? 'auto-applied from UPS official table' : 'UPS 공식 표 기준 자동 적용'}:{' '}
            {(Math.ceil(billableWeight) * surgeFeeInfo.rate).toLocaleString()} KRW (+FSC)
          </span>
        </div>
      )}

      {detectedEas && (
        <UpsEasBanner
          detectedEas={detectedEas}
          rates={rates}
          billableWeight={billableWeight}
          destinationCountry={destinationCountry}
          destinationZip={destinationZip}
          selectedAddOns={selectedAddOns}
          onAddOnsChange={onAddOnsChange}
          isEn={isEn}
        />
      )}

      {ahsCount > 0 && (
        <div className='flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5'>
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
          <span>
            <b>Additional Handling (AHS)</b> {isEn ? 'auto-detected' : '자동 감지'}: {ahsCount}
            {isEn ? ' cartons' : '카톤'} &mdash;{' '}
            {((rates.find((r) => r.code === 'AHS')?.amount ?? 21_400) * ahsCount).toLocaleString()}{' '}
            KRW (+FSC)
          </span>
        </div>
      )}

      {isDDP && (
        <div className='flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5'>
          <Info className='w-3.5 h-3.5 shrink-0' />
          <span>
            <b>DDP Service Fee</b> {isEn ? 'auto-applied' : '자동 적용'}:{' '}
            {(rates.find((r) => r.code === 'DDP')?.amount ?? 28_500).toLocaleString()} KRW
          </span>
        </div>
      )}
    </>
  );

  return (
    <AddOnPanelShell
      theme='ups'
      title={`UPS ${isEn ? 'Add-on Services' : '부가서비스'}`}
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
    />
  );
};

const EAS_LABELS: Record<string, { ko: string; en: string }> = {
  EAS: { ko: '외곽 지역', en: 'Extended Area' },
  RAS: { ko: '원거리 지역', en: 'Remote Area' },
  DAS: { ko: '배송 지역', en: 'Delivery Area' },
};

const UpsEasBanner: React.FC<{
  detectedEas: NonNullable<EasSurchargeType>;
  rates: NormalizedRate[];
  billableWeight: number;
  destinationCountry?: string;
  destinationZip?: string;
  selectedAddOns: string[];
  onAddOnsChange: (codes: string[]) => void;
  isEn: boolean;
}> = ({
  detectedEas,
  rates,
  billableWeight,
  destinationCountry,
  destinationZip,
  selectedAddOns,
  onAddOnsChange,
  isEn,
}) => {
  const code = detectedEas === 'RAS' ? 'RMT' : 'EXT';
  const rate = rates.find((r) => r.code === code);
  const fee = rate ? calcAddonFee(rate, billableWeight, 0) : 0;
  const label = EAS_LABELS[detectedEas] || EAS_LABELS.EAS;

  return (
    <div className='flex items-start gap-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2.5 py-1.5'>
      <MapPin className='w-3.5 h-3.5 shrink-0 mt-0.5' />
      <div>
        <span>
          <b>
            {isEn ? label.en : label.ko} Surcharge ({detectedEas})
          </b>{' '}
          {isEn ? 'auto-detected for' : '자동 감지'}: {destinationCountry} {destinationZip}
          {fee > 0 && <> &mdash; {fee.toLocaleString()} KRW (+FSC)</>}
        </span>
        {!selectedAddOns.includes(code) && (
          <button
            type='button'
            onClick={() => onAddOnsChange([...selectedAddOns, code])}
            className='ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors'
          >
            + {isEn ? 'Apply' : '적용'}
          </button>
        )}
        {selectedAddOns.includes(code) && (
          <span className='ml-2 text-[10px] font-bold text-green-600 dark:text-green-400'>
            ✓ {isEn ? 'Applied' : '적용됨'}
          </span>
        )}
      </div>
    </div>
  );
};
