import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// WAI-ARIA APG Disclosure (DESIGN.md §10.3): the button lives inside the heading,
// the panel always exists so aria-controls never dangles, and children mount only
// while open — admin widgets fetch on mount, so lazy mounting is load-bearing.
//
// The panel owns its Suspense boundary. Callers pass React.lazy children, and a
// suspension that escapes to a shared boundary above would hide every section —
// the focused trigger with them — dropping keyboard focus to <body>.
const PanelFallback: React.FC = () => (
  <div role='status' aria-label='Loading' className='p-4'>
    <div className='h-24 rounded-lg bg-gray-100 dark:bg-gray-700/40 animate-pulse motion-reduce:animate-none' />
  </div>
);

export const CollapsibleSection: React.FC<Props> = ({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm'>
      <h4 className='text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider'>
        <button
          type='button'
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((prev) => !prev)}
          className='w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between gap-2 text-left uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue-500'
        >
          <span className='flex items-center gap-2'>
            {icon}
            <span>{title}</span>
            {badge}
          </span>
          <ChevronRight
            aria-hidden='true'
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        </button>
      </h4>
      <div
        id={panelId}
        role='region'
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className='animate-enter-fade motion-reduce:animate-none'
      >
        {isOpen && <React.Suspense fallback={<PanelFallback />}>{children}</React.Suspense>}
      </div>
    </div>
  );
};
