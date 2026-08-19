import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryDisplayName } from '@/config/options';

interface Props {
  carrier: 'UPS' | 'DHL' | 'FEDEX';
  country: string;
}

const CARRIER_DISPLAY: Record<Props['carrier'], string> = {
  UPS: 'UPS',
  DHL: 'DHL',
  FEDEX: 'FedEx',
};

/**
 * Shown in place of the quote result when the destination country has no zone
 * in the selected carrier's official zone table. There is no fallback zone —
 * quoting an unmapped destination off a guessed zone is worse than no quote.
 */
export const ZoneUnavailableNotice: React.FC<Props> = ({ carrier, country }) => {
  const { t } = useLanguage();
  const carrierName = CARRIER_DISPLAY[carrier];
  const countryName = getCountryDisplayName(country);

  return (
    <div className='rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-4'>
      <div className='flex items-start gap-3'>
        <AlertTriangle className='h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5' />
        <div>
          <h3 className='text-sm font-bold text-amber-800 dark:text-amber-200'>
            {t('zone.unavailable.title').replace('{carrier}', carrierName)}
          </h3>
          <p className='mt-1 text-sm text-amber-700 dark:text-amber-300'>
            {t('zone.unavailable.message')
              .replace('{country}', countryName)
              .replace(/\{carrier\}/g, carrierName)}
          </p>
        </div>
      </div>
    </div>
  );
};
