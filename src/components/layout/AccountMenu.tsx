import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface AccountMenuProps {
  name: string;
  email: string;
  userRole: string;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const initialsOf = (name: string): string =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Desktop account menu. Logout used to be a bare red icon next to the theme
// toggle — one mis-click away and with no label. It now sits last in a menu
// behind the user's own name, the pattern most B2B apps use (ChatGPT,
// Docusign, Etsy on Mobbin), separated from the harmless items by a divider.
export const AccountMenu: React.FC<AccountMenuProps> = ({
  name,
  email,
  userRole,
  onOpenSettings,
  onLogout,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[0]?.focus();

    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const moveFocus = (delta: number) => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(current + delta + items.length) % items.length]?.focus();
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const select = (action: () => void) => {
    close(false);
    action();
  };

  const itemClass =
    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-md transition-colors focus:outline-none';

  return (
    <div ref={rootRef} className='relative'>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !isOpen) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-label={t('nav.accountMenu')}
        aria-haspopup='menu'
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className='flex items-center gap-2.5 min-h-[44px] pl-1.5 pr-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 transition-colors'
      >
        <span
          aria-hidden='true'
          className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deep-blue text-xs font-semibold text-white'
        >
          {initialsOf(name)}
        </span>
        {/* Below md the header is crowded (admin links + language + theme);
            the avatar alone opens the menu, which repeats name and role. */}
        <span className='hidden md:flex flex-col items-start leading-tight whitespace-nowrap'>
          <span className='text-sm font-medium text-gray-900 dark:text-white'>{name}</span>
          <span className='text-xs font-semibold uppercase tracking-wider text-brand-blue-600 dark:text-brand-blue-300'>
            {userRole}
          </span>
        </span>
        <ChevronDown
          aria-hidden='true'
          className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        // The identity block sits outside role='menu': a menu may only own
        // menuitems, groups and separators, so screen readers in menu mode
        // would skip plain text placed inside it.
        <div className='absolute right-0 mt-2 w-64 z-50 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1.5 shadow-xl'>
          <div className='px-3 pt-2 pb-3'>
            <p className='truncate text-sm font-semibold text-gray-900 dark:text-white'>{name}</p>
            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>{email}</p>
            <span className='mt-2 inline-flex items-center rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-brand-blue-700 dark:bg-brand-blue-900/40 dark:text-brand-blue-200'>
              {userRole}
            </span>
          </div>

          <div className='my-1 h-px bg-gray-200 dark:bg-gray-700' aria-hidden='true' />

          <div
            id={menuId}
            role='menu'
            tabIndex={-1}
            aria-label={t('nav.accountMenu')}
            onKeyDown={handleMenuKeyDown}
          >
            <button
              ref={(el) => {
                itemRefs.current[0] = el;
              }}
              type='button'
              role='menuitem'
              tabIndex={-1}
              onClick={() => select(onOpenSettings)}
              className={`${itemClass} text-gray-700 dark:text-gray-200 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800`}
            >
              <Settings aria-hidden='true' className='h-4 w-4 text-gray-500 dark:text-gray-400' />
              {t('settings.account.title')}
            </button>

            <div className='my-1 h-px bg-gray-200 dark:bg-gray-700' role='separator' />

            <button
              ref={(el) => {
                itemRefs.current[1] = el;
              }}
              type='button'
              role='menuitem'
              tabIndex={-1}
              onClick={() => select(onLogout)}
              className={`${itemClass} text-destructive-700 dark:text-destructive-300 hover:bg-destructive-50 focus:bg-destructive-50 dark:hover:bg-destructive-900/20 dark:focus:bg-destructive-900/20`}
            >
              <LogOut aria-hidden='true' className='h-4 w-4' />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
