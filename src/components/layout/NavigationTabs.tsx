import React, { useRef } from 'react';
import { Calculator, History, type LucideIcon } from 'lucide-react';
import { VIEW_PANEL_ID, viewTabId, type AppView } from './quoteViews';

export type { AppView } from './quoteViews';

const TABS: ReadonlyArray<{ view: AppView; label: string; Icon: LucideIcon }> = [
  { view: 'calculator', label: 'Calculator', Icon: Calculator },
  { view: 'history', label: 'History', Icon: History },
];

interface Props {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

function targetIndex(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

// WAI-ARIA APG Tabs with automatic activation (DESIGN.md §10.3): one tab stop
// (roving tabindex), arrows/Home/End move focus and switch the view at once.
// Switching is cheap and there are only two views, so manual activation would
// just add a keypress.
export const NavigationTabs: React.FC<Props> = ({ currentView, onViewChange }) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = targetIndex(event.key, index, TABS.length);
    if (next === null) return;
    event.preventDefault();
    onViewChange(TABS[next].view);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role='tablist'
      aria-label='Quote views'
      className='flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5'
    >
      {TABS.map(({ view, label, Icon }, index) => {
        const selected = currentView === view;
        return (
          <button
            key={view}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type='button'
            role='tab'
            id={viewTabId(view)}
            aria-selected={selected}
            aria-controls={VIEW_PANEL_ID}
            aria-label={label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onViewChange(view)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 ${
              selected
                ? 'bg-white dark:bg-gray-600 text-brand-blue-600 dark:text-brand-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon aria-hidden='true' className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
