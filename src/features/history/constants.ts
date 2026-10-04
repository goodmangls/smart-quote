import { QuoteStatus } from '@/types';

export const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-info-100 text-info-700 dark:bg-info-900/40 dark:text-info-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
