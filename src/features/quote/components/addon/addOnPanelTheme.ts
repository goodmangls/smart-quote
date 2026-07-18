/**
 * Carrier-specific visual theme for Add-on panels.
 * Pricing/rates stay in each carrier's normalize*Rates + config — theme is UI only.
 */
export type AddOnCarrierTheme = 'ups' | 'dhl';

export interface AddOnPanelThemeClasses {
  panel: string;
  icon: string;
  title: string;
  totalPill: string;
  selectedCard: string;
  unselectedCard: string;
  checkbox: string;
  selectedName: string;
  selectedAmount: string;
}

export const ADDON_PANEL_THEMES: Record<AddOnCarrierTheme, AddOnPanelThemeClasses> = {
  ups: {
    panel:
      'rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3',
    icon: 'w-4 h-4 text-blue-600 dark:text-blue-400',
    title: 'font-semibold text-blue-700 dark:text-blue-300',
    totalPill:
      'ml-auto text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full',
    selectedCard: 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700',
    unselectedCard:
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700',
    checkbox: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5',
    selectedName: 'text-blue-800 dark:text-blue-200',
    selectedAmount: 'text-blue-700 dark:text-blue-300 font-semibold',
  },
  dhl: {
    panel:
      'rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10 p-3',
    icon: 'w-4 h-4 text-yellow-600 dark:text-yellow-400',
    title: 'font-semibold text-yellow-700 dark:text-yellow-300',
    totalPill:
      'ml-auto text-xs font-bold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-full',
    selectedCard:
      'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700',
    unselectedCard:
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700',
    checkbox: 'rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 w-3.5 h-3.5',
    selectedName: 'text-yellow-800 dark:text-yellow-200',
    selectedAmount: 'text-yellow-700 dark:text-yellow-300 font-semibold',
  },
};
