import React from 'react';
import { Package } from 'lucide-react';
import type { NormalizedRate } from '@/config/addon-utils';
import { ADDON_PANEL_THEMES, type AddOnCarrierTheme } from './addOnPanelTheme';

export interface AddOnPanelShellProps {
  /** Visual theme only — does not select rate tables. */
  theme: AddOnCarrierTheme;
  title: string;
  isMobileView: boolean;
  showDbBadge: boolean;
  /** Pre-computed carrier total (UPS/DHL each calculate with their own rates). */
  totalSelected: number;
  selectableAddOns: NormalizedRate[];
  selectedAddOns: string[];
  isEn: boolean;
  onToggle: (code: string) => void;
  getDisplayAmount: (code: string, rate: NormalizedRate) => string;
  formatUnit: (unit: string) => string;
  notices?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Shared chrome for carrier add-on UIs.
 * Callers must pass rates already normalized per carrier (normalizeUpsRates / normalizeDhlRates).
 */
export const AddOnPanelShell: React.FC<AddOnPanelShellProps> = ({
  theme,
  title,
  isMobileView,
  showDbBadge,
  totalSelected,
  selectableAddOns,
  selectedAddOns,
  isEn,
  onToggle,
  getDisplayAmount,
  formatUnit,
  notices,
  footer,
}) => {
  const t = ADDON_PANEL_THEMES[theme];

  return (
    <div className='col-span-full'>
      <div className={t.panel}>
        <div className='flex items-center gap-2 mb-3'>
          <Package className={t.icon} />
          <span className={`${t.title} ${isMobileView ? 'text-base' : 'text-sm'}`}>{title}</span>
          {showDbBadge && (
            <span className='text-[9px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded'>
              DB
            </span>
          )}
          {totalSelected > 0 && (
            <span className={t.totalPill}>+{totalSelected.toLocaleString()} KRW</span>
          )}
        </div>

        {notices != null && <div className='mb-3 space-y-1'>{notices}</div>}

        <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5`}>
          {selectableAddOns.map((addon) => {
            const isSelected = selectedAddOns.includes(addon.code);
            return (
              <label
                key={addon.code}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs ${
                  isSelected ? t.selectedCard : t.unselectedCard
                }`}
              >
                <input
                  type='checkbox'
                  checked={isSelected}
                  onChange={() => onToggle(addon.code)}
                  className={t.checkbox}
                />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between gap-1'>
                    <span
                      className={`font-medium truncate ${
                        isSelected ? t.selectedName : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {isEn ? addon.nameEn : addon.nameKo}
                    </span>
                    <span
                      className={`shrink-0 tabular-nums ${
                        isSelected ? t.selectedAmount : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {getDisplayAmount(addon.code, addon)}
                    </span>
                  </div>
                  <div className='flex items-center gap-1 mt-0.5'>
                    <span className='text-[10px] text-gray-400'>/{formatUnit(addon.unit)}</span>
                    {addon.fscApplicable && (
                      <span className='text-[10px] text-orange-500 dark:text-orange-400 font-medium'>
                        +FSC
                      </span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {footer}
      </div>
    </div>
  );
};
