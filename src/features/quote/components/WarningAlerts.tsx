import React from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resultStyles } from './result-styles';

interface Props {
  warnings: string[];
  /** Document selected but Parcel/IP tariff applied due to weight cap */
  documentRatedAsParcel?: boolean;
}

export const WarningAlerts: React.FC<Props> = ({ warnings, documentRatedAsParcel }) => {
  const { t } = useLanguage();
  if (warnings.length === 0 && !documentRatedAsParcel) return null;

  return (
    <div className='space-y-3'>
      {documentRatedAsParcel && (
        <div className='flex items-start gap-2 rounded-xl border border-info/30 bg-brand-blue-50 dark:bg-brand-blue-900/20 px-4 py-3'>
          <Package className='h-5 w-5 text-brand-blue-600 dark:text-brand-blue-400 flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-brand-blue-700 dark:text-brand-blue-300'>
              {t('calc.badge.ratedAsParcel')}
            </p>
            <p className='mt-0.5 text-sm text-brand-blue-800 dark:text-brand-blue-200'>
              {t('calc.badge.ratedAsParcelHint')}
            </p>
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className={resultStyles.warningCardClass}>
          <div className='flex'>
            <AlertTriangle className='h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5' />
            <div className='ml-3'>
              <h3 className='text-sm font-bold text-amber-800 dark:text-amber-200'>
                Attention Needed
              </h3>
              <ul className='list-disc pl-5 mt-1 text-sm text-amber-700 dark:text-amber-300 space-y-1'>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
