import React from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import type { FscRates } from '@/api/fscApi';
import { FSC_CARRIER_LINKS } from './fscConstants';

interface Props {
  data: FscRates | null;
  loading: boolean;
  isEditing: boolean;
  editRates: { UPS: string; DHL: string };
  onEditRatesChange: (next: { UPS: string; DHL: string }) => void;
}

export const FscRateDisplay: React.FC<Props> = ({
  data,
  loading,
  isEditing,
  editRates,
  onEditRatesChange,
}) => {
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
    <div className='grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700'>
      {(['UPS', 'DHL'] as const).map((carrier) => {
        const rates = data.rates[carrier];
        const link = FSC_CARRIER_LINKS[carrier];

        return (
          <div key={carrier} className='px-4 py-4 flex flex-col items-center text-center'>
            <div className='flex items-center gap-2 mb-2'>
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
              <div className='flex items-center justify-center gap-1.5'>
                <input
                  type='number'
                  step='0.25'
                  min={0}
                  max={100}
                  value={editRates[carrier]}
                  onChange={(e) => onEditRatesChange({ ...editRates, [carrier]: e.target.value })}
                  className='w-20 px-2 py-1 text-sm font-bold rounded border border-brand-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500 text-center'
                />
                <span className='text-sm font-bold text-gray-500 dark:text-gray-400'>%</span>
              </div>
            ) : (
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {rates.international}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
