/**
 * Carrier-specific visual theme for Add-on panels.
 * Pricing/rates stay in each carrier's normalize*Rates + config — theme is UI only.
 *
 * Colours follow DESIGN.md §8.5 (UPS amber · DHL yellow · FedEx cyan) — the same
 * carrier must not change colour between the comparison card and its add-on panel.
 */
export type AddOnCarrierTheme = 'ups' | 'dhl' | 'fedex';

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
      'rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3',
    icon: 'w-4 h-4 text-amber-600 dark:text-amber-400',
    title: 'font-semibold text-amber-700 dark:text-amber-300',
    totalPill:
      'ml-auto text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full',
    selectedCard: 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700',
    unselectedCard:
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700',
    checkbox: 'rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5',
    selectedName: 'text-amber-800 dark:text-amber-200',
    selectedAmount: 'text-amber-700 dark:text-amber-300 font-semibold',
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
  fedex: {
    panel:
      'rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-900/10 p-3',
    icon: 'w-4 h-4 text-cyan-600 dark:text-cyan-400',
    title: 'font-semibold text-cyan-700 dark:text-cyan-300',
    totalPill:
      'ml-auto text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/40 px-2 py-0.5 rounded-full',
    selectedCard:
      'bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700',
    unselectedCard:
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700',
    checkbox: 'rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5',
    selectedName: 'text-cyan-800 dark:text-cyan-200',
    selectedAmount: 'text-cyan-700 dark:text-cyan-300 font-semibold',
  },
};
