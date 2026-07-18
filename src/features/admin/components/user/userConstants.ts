import type { FreightNetwork } from '@/contexts/AuthContext';

export const NETWORK_OPTIONS: FreightNetwork[] = ['WCA', 'MPL', 'EAN', 'JCtrans'];

export const NETWORK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  WCA: {
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-500/40',
  },
  MPL: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-500/40',
  },
  EAN: {
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-500/40',
  },
  JCtrans: {
    bg: 'bg-red-100 dark:bg-red-500/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-500/40',
  },
};
