import React, { useState, useMemo } from 'react';
import {
  UPS_EXACT_RATES,
  UPS_RANGE_RATES,
  UPS_DOC_EXACT_RATES,
  UPS_DOC_MAX_KG,
} from '@/config/ups_tariff';
import {
  DHL_EXACT_RATES,
  DHL_RANGE_RATES,
  DHL_DOC_EXACT_RATES,
  DHL_DOC_MAX_KG,
} from '@/config/dhl_tariff';
import {
  FEDEX_EXACT_RATES,
  FEDEX_RANGE_RATES,
  FEDEX_ENVELOPE_EXACT_RATES,
  FEDEX_PAK_EXACT_RATES,
  FEDEX_ENVELOPE_MAX_KG,
  FEDEX_DOC_MAX_KG,
} from '@/config/fedex_tariff';
import { TableProperties, ChevronDown } from 'lucide-react';
import { formatNum } from '@/lib/format';

type Carrier = 'UPS' | 'DHL' | 'FEDEX';
type TableMode = 'exact' | 'range';
/** Unified product key — Parcel for all; Document for UPS/DHL; Envelope/Pak for FedEx */
type RateProduct = 'parcel' | 'document' | 'envelope' | 'pak';

type ExactRateTable = Record<string, Record<number, number>>;

const PRODUCT_OPTIONS: Record<Carrier, { value: RateProduct; label: string }[]> = {
  UPS: [
    { value: 'parcel', label: 'Parcel' },
    { value: 'document', label: `Document (≤${UPS_DOC_MAX_KG}kg)` },
  ],
  DHL: [
    { value: 'parcel', label: 'Parcel' },
    { value: 'document', label: `Document (≤${DHL_DOC_MAX_KG}kg)` },
  ],
  FEDEX: [
    { value: 'parcel', label: 'IP (Parcel)' },
    { value: 'envelope', label: `Envelope (≤${FEDEX_ENVELOPE_MAX_KG}kg)` },
    { value: 'pak', label: `Pak (≤${FEDEX_DOC_MAX_KG}kg)` },
  ],
};

function resolveExactRates(carrier: Carrier, product: RateProduct): ExactRateTable {
  if (carrier === 'FEDEX') {
    if (product === 'envelope') return FEDEX_ENVELOPE_EXACT_RATES;
    if (product === 'pak') return FEDEX_PAK_EXACT_RATES;
    return FEDEX_EXACT_RATES;
  }
  if (carrier === 'UPS') {
    return product === 'document' ? UPS_DOC_EXACT_RATES : UPS_EXACT_RATES;
  }
  return product === 'document' ? DHL_DOC_EXACT_RATES : DHL_EXACT_RATES;
}

function productLabel(carrier: Carrier, product: RateProduct): string {
  return PRODUCT_OPTIONS[carrier].find((o) => o.value === product)?.label ?? product;
}

/** Sentinel used by the tariff tables for the open-ended last bracket. */
const OPEN_ENDED_MAX = 99_999;

const rangeLabel = (min: number, max: number): string =>
  max >= OPEN_ENDED_MAX ? `${min}kg+` : `${min}–${max}kg`;

/**
 * Zone keys in display order — numeric-aware, so Z10 follows Z9 rather than
 * landing between Z1 and Z2. FedEx letter zones fall back to alphabetical.
 *
 * Copies before sorting: `Array.prototype.sort` mutates, and callers pass keys
 * derived from the shared tariff tables.
 */
const sortZones = (keys: string[]): string[] =>
  [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

/** Zones of the table a carrier/product pair resolves to, ready to render. */
const zonesFor = (carrier: Carrier, product: RateProduct): string[] =>
  sortZones(Object.keys(resolveExactRates(carrier, product)));

export const RateTableViewer: React.FC = () => {
  const [carrier, setCarrier] = useState<Carrier>('UPS');
  const [mode, setMode] = useState<TableMode>('exact');
  const [selectedZone, setSelectedZone] = useState<string>('Z1');
  const [product, setProduct] = useState<RateProduct>('parcel');

  const exactRates = useMemo(() => resolveExactRates(carrier, product), [carrier, product]);

  const rangeRates: ReadonlyArray<{ min: number; max: number; rates: Record<string, number> }> =
    carrier === 'FEDEX' ? FEDEX_RANGE_RATES : carrier === 'UPS' ? UPS_RANGE_RATES : DHL_RANGE_RATES;

  const zones = useMemo(() => sortZones(Object.keys(exactRates)), [exactRates]);

  // The per-kg range table extends the Parcel tariff, so its threshold and
  // zone list come from the parcel table regardless of the selected product.
  const parcelMaxKg = useMemo(() => {
    const parcel = resolveExactRates(carrier, 'parcel');
    const weights = Object.values(parcel).flatMap((zone) => Object.keys(zone).map(Number));
    return Math.max(...weights);
  }, [carrier]);

  const rangeZones = useMemo(() => zonesFor(carrier, 'parcel'), [carrier]);

  // Worked example for the banner: first bracket, first zone, a sample weight
  // a few kg into the bracket — makes "rate × weight" concrete.
  const rangeExample = useMemo(() => {
    const first = rangeRates[0];
    const zone = rangeZones[0];
    const rate = first && zone ? first.rates[zone] : undefined;
    if (!first || !zone || !rate) return null;
    const weight = Math.min(Math.ceil(first.min) + 4, Math.floor(first.max));
    return { zone, weight, rate, total: rate * weight };
  }, [rangeRates, rangeZones]);

  const activeZone = zones.includes(selectedZone) ? selectedZone : (zones[0] ?? selectedZone);

  const exactWeights = useMemo(() => {
    const zone = exactRates[activeZone];
    if (!zone) return [];
    return Object.entries(zone)
      .map(([w, r]) => ({ weight: Number(w), rate: r }))
      .sort((a, b) => a.weight - b.weight);
  }, [exactRates, activeZone]);

  const handleCarrierChange = (next: Carrier) => {
    setCarrier(next);
    setProduct('parcel');
    setSelectedZone(zonesFor(next, 'parcel')[0] ?? 'Z1');
  };

  const handleProductChange = (next: RateProduct) => {
    setProduct(next);
    const nextZones = zonesFor(carrier, next);
    if (!nextZones.includes(selectedZone)) {
      setSelectedZone(nextZones[0] ?? selectedZone);
    }
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm'>
      <div className='px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2'>
          <TableProperties className='w-4 h-4 text-brand-blue-500' />
          <h4 className='text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider'>
            Rate Tables
          </h4>
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          <select
            value={carrier}
            onChange={(e) => handleCarrierChange(e.target.value as Carrier)}
            aria-label='Carrier'
            className='text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          >
            <option value='UPS'>UPS</option>
            <option value='DHL'>DHL</option>
            <option value='FEDEX'>FedEx</option>
          </select>
          {mode === 'exact' && (
            <select
              value={product}
              onChange={(e) => handleProductChange(e.target.value as RateProduct)}
              aria-label='Rate product'
              className='text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            >
              {PRODUCT_OPTIONS[carrier].map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TableMode)}
            aria-label='Table view'
            className='text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          >
            <option value='exact'>Exact</option>
            <option value='range'>{`Over ${parcelMaxKg}kg (per-kg)`}</option>
          </select>
        </div>
      </div>

      {mode === 'exact' ? (
        <div>
          <div className='px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex gap-1 overflow-x-auto'>
            {zones.map((z) => (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  z === activeZone
                    ? 'bg-brand-blue-100 text-brand-blue-700 dark:bg-brand-blue-900/30 dark:text-brand-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          <div className='max-h-[300px] overflow-y-auto'>
            <table className='w-full text-xs'>
              <thead className='sticky top-0 bg-gray-50 dark:bg-gray-700/50'>
                <tr>
                  <th className='text-left px-4 py-2 text-gray-500 dark:text-gray-400'>
                    Weight (kg)
                  </th>
                  <th className='text-right px-4 py-2 text-gray-500 dark:text-gray-400'>
                    Rate (KRW)
                  </th>
                  <th className='text-right px-4 py-2 text-gray-500 dark:text-gray-400'>Per kg</th>
                </tr>
              </thead>
              <tbody>
                {exactWeights.map(({ weight, rate }) => (
                  <tr
                    key={weight}
                    className='border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20'
                  >
                    <td className='px-4 py-1.5 font-medium text-gray-700 dark:text-gray-300'>
                      {weight}
                    </td>
                    <td className='px-4 py-1.5 text-right text-gray-900 dark:text-white tabular-nums'>
                      {formatNum(rate)}
                    </td>
                    <td className='px-4 py-1.5 text-right text-gray-500 dark:text-gray-400 tabular-nums'>
                      {formatNum(Math.round(rate / weight))}
                    </td>
                  </tr>
                ))}
                {product === 'parcel' && (
                  <tr>
                    <td colSpan={3} className='p-0'>
                      <button
                        onClick={() => setMode('range')}
                        className='w-full text-left px-4 py-2 text-[11px] font-medium text-brand-blue-600 dark:text-brand-blue-400 hover:bg-brand-blue-50 dark:hover:bg-brand-blue-900/20 transition-colors'
                      >
                        Over {parcelMaxKg}kg — per-kg range rates →
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className='px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-brand-blue-50/50 dark:bg-brand-blue-900/10'>
            <p className='text-[11px] font-medium text-gray-700 dark:text-gray-300'>
              Per-kg tariff for shipments over {parcelMaxKg}kg — picks up where the {carrier} Parcel
              table ends.
            </p>
            <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-0.5'>
              Freight = rate (₩/kg) × chargeable weight, rounded up to the next 1kg.
            </p>
            {rangeExample && (
              <p className='text-[10px] text-gray-500 dark:text-gray-400 tabular-nums mt-0.5'>
                e.g. {rangeExample.zone} · {rangeExample.weight}kg → {formatNum(rangeExample.rate)}{' '}
                × {rangeExample.weight} = ₩{formatNum(rangeExample.total)}
              </p>
            )}
          </div>
          <div className='max-h-[350px] overflow-y-auto'>
            <table className='w-full text-xs'>
              <thead className='sticky top-0 bg-gray-50 dark:bg-gray-700/50'>
                <tr>
                  <th className='text-left px-4 py-2 text-gray-500 dark:text-gray-400'>
                    Weight range
                  </th>
                  {rangeZones.map((z) => (
                    <th key={z} className='text-right px-2 py-2 text-gray-500 dark:text-gray-400'>
                      {z}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rangeRates.map((row, i) => {
                  const rates = row.rates as Record<string, number>;
                  return (
                    <tr
                      key={i}
                      className='border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20'
                    >
                      <td className='px-4 py-1.5 font-medium text-gray-700 dark:text-gray-300'>
                        {rangeLabel(row.min, row.max)}
                      </td>
                      {rangeZones.map((z) => (
                        <td
                          key={z}
                          className='px-2 py-1.5 text-right text-gray-900 dark:text-white tabular-nums'
                        >
                          {rates[z] ? formatNum(rates[z]) : '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className='px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5'>
        <ChevronDown className='w-3 h-3 text-gray-400' />
        <span className='text-[10px] text-gray-400 dark:text-gray-400'>
          {carrier} {mode === 'exact' ? productLabel(carrier, product) : `Over ${parcelMaxKg}kg`} •{' '}
          {mode === 'exact'
            ? `${activeZone}: ${exactWeights.length} weight steps`
            : `${rangeRates.length} weight brackets × ${rangeZones.length} zones · unit ₩/kg`}
        </span>
      </div>
    </div>
  );
};
