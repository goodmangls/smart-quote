import React from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import type { FscRates } from '@/api/fscApi';
import { FSC_CARRIER_LINKS } from './fscConstants';

interface Props {
  data: FscRates | null;
  loading: boolean;
  isEditing: boolean;
  editRates: { UPS: string; DHL: string; FEDEX: string };
  onEditRatesChange: (next: { UPS: string; DHL: string; FEDEX: string }) => void;
  /** Set only after a save failed; drives the "현재 DB" row under each input. */
  saveError?: string | null;
  /** useFscRates' read error, so a failed re-read is not rendered as a value. */
  ratesError?: string | null;
}

export const FscRateDisplay: React.FC<Props> = ({
  data,
  loading,
  isEditing,
  editRates,
  onEditRatesChange,
  saveError = null,
  ratesError = null,
}) => {
  /**
   * What the row under each input may honestly claim about `fsc_rates`.
   *
   * Three states, not two. `useFscRates` seeds `data` from rates.ts and only
   * replaces it on a successful read, and it clears `error` the moment a read
   * starts — so mid-request, and after a failed read, we are holding values we
   * never got from the table. Printing those as "현재 DB" would present the
   * CONSTANTS as the table's contents, which is the exact confusion this row
   * exists to resolve.
   */
  const dbValueLabel = (rate: number | undefined): string => {
    if (loading) return '현재 DB: 확인 중…';
    if (ratesError) return '현재 DB: 읽지 못했습니다';
    return `현재 DB: ${typeof rate === 'number' ? `${rate.toFixed(2)}%` : '—'}`;
  };

  if (loading && !data) {
    return (
      <div className='p-6 text-center text-xs text-gray-400'>
        <Loader2 className='w-4 h-4 animate-spin mx-auto' />
      </div>
    );
  }

  if (!data) {
    return <div className='p-6 text-center text-xs text-gray-400'>Failed to load rates</div>;
  }

  return (
    <div className='grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700'>
      {(['UPS', 'DHL', 'FEDEX'] as const).map((carrier) => {
        const rates = data.rates[carrier];
        const link = FSC_CARRIER_LINKS[carrier];

        return (
          <div key={carrier} className='px-3 py-4 flex flex-col items-center text-center'>
            <div className='flex items-center gap-1.5 mb-2'>
              <span className='text-xs font-bold text-gray-900 dark:text-white'>{carrier}</span>
              <a
                href={link}
                target='_blank'
                rel='noopener noreferrer'
                className='text-gray-400 hover:text-brand-blue-500 transition-colors'
                title={`${carrier} 공식 연료 할증료 페이지 열기`}
              >
                <ExternalLink className='w-3.5 h-3.5' />
              </a>
            </div>
            {isEditing ? (
              <div className='flex flex-col items-center gap-1'>
                <div className='flex items-center justify-center gap-1.5'>
                  <input
                    type='number'
                    step='0.25'
                    min={0}
                    max={100}
                    value={editRates[carrier]}
                    onChange={(e) => onEditRatesChange({ ...editRates, [carrier]: e.target.value })}
                    aria-label={`${carrier} FSC 요율 (%)`}
                    className='w-16 px-1.5 py-1 text-sm font-bold rounded border border-brand-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500 text-center'
                  />
                  <span className='text-sm font-bold text-gray-500 dark:text-gray-400'>%</span>
                </div>
                {/* After a failed save the cells still render what the admin typed, so
                    without this the "check 현재 DB" advice points at nothing on screen. */}
                {saveError && (
                  <span
                    className='text-[10px] text-gray-500 dark:text-gray-400'
                    data-testid={`fsc-db-value-${carrier}`}
                  >
                    {dbValueLabel(rates?.international)}
                  </span>
                )}
              </div>
            ) : (
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {rates?.international ?? '—'}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
