import React from 'react';
import { AmountCurrency, QuoteStatus } from '@/types';
import { Search, X, Filter } from 'lucide-react';
import { STATUS_COLORS } from '@/features/history/constants';

const STATUS_OPTIONS: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected'];
const CURRENCY_OPTIONS: AmountCurrency[] = ['KRW', 'USD'];

interface Props {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
  activeStatus: QuoteStatus | undefined;
  onStatusFilter: (status: QuoteStatus | undefined) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  minAmount: number | undefined;
  maxAmount: number | undefined;
  amountCurrency: AmountCurrency;
  onAmountChange: (next: { min: number | undefined; max: number | undefined }) => void;
  onCurrencyChange: (next: AmountCurrency) => void;
}

export const QuoteSearchBar: React.FC<Props> = ({
  searchInput,
  onSearchInputChange,
  onSearch,
  activeStatus,
  onStatusFilter,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  minAmount,
  maxAmount,
  amountCurrency,
  onAmountChange,
  onCurrencyChange,
}) => {
  const amountStep = amountCurrency === 'KRW' ? 1000 : 0.01;
  const rangeInvalid = minAmount != null && maxAmount != null && minAmount > maxAmount;

  return (
    <div className='mb-6 space-y-3'>
      <div className='flex gap-2'>
        <form onSubmit={onSearch} className='flex gap-2 flex-1'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder='Search by reference no or destination...'
              className='w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue-500 focus:border-transparent'
            />
          </div>
          <button
            type='submit'
            className='px-4 py-2.5 text-sm font-medium text-white bg-brand-blue-600 rounded-lg hover:bg-brand-blue-700 transition-colors'
          >
            Search
          </button>
        </form>
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors sm:hidden ${
            showFilters || hasActiveFilters
              ? 'border-brand-blue-500 text-brand-blue-600 bg-brand-blue-50 dark:bg-brand-blue-900/20 dark:text-brand-blue-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          }`}
        >
          <Filter className='w-4 h-4' />
        </button>
      </div>

      {showFilters && (
        <div className='space-y-2'>
          <div className='flex flex-wrap gap-2 items-center'>
            <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>Status:</span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onStatusFilter(activeStatus === s ? undefined : s)}
                className={`px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs font-medium rounded-full capitalize transition-colors ${
                  activeStatus === s
                    ? STATUS_COLORS[s]
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className='flex items-center gap-1 px-2.5 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs text-red-500 hover:text-red-700 transition-colors'
              >
                <X className='w-4 h-4 sm:w-3 sm:h-3' />
                Clear all
              </button>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>Amount:</span>
            <div className='inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden'>
              {CURRENCY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type='button'
                  onClick={() => onCurrencyChange(c)}
                  aria-pressed={amountCurrency === c}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    amountCurrency === c
                      ? 'bg-brand-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type='number'
              inputMode='decimal'
              step={amountStep}
              placeholder='Min amount'
              value={minAmount ?? ''}
              onChange={(e) =>
                onAmountChange({
                  min: e.target.value === '' ? undefined : Number(e.target.value),
                  max: maxAmount,
                })
              }
              className='w-32 px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
            />
            <span className='text-xs text-gray-400'>~</span>
            <input
              type='number'
              inputMode='decimal'
              step={amountStep}
              placeholder='Max amount'
              value={maxAmount ?? ''}
              onChange={(e) =>
                onAmountChange({
                  min: minAmount,
                  max: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className='w-32 px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
            />
            {rangeInvalid && <span className='text-xs text-red-500'>min must be ≤ max</span>}
          </div>
        </div>
      )}
    </div>
  );
};
