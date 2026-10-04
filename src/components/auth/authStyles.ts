// Shared class strings for the auth pages (login, signup, magic-link verify).
// Documented in docs/02-design/DESIGN.md §8.8 — change them there first.

export const authInputClass =
  'w-full py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue transition-colors';

export const authLabelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

export const authPrimaryButtonClass =
  'w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-blue hover:bg-brand-blue-600 text-white text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed';

export const authSecondaryButtonClass =
  'w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50';

export const authTextLinkClass =
  'font-medium text-brand-blue-600 hover:text-brand-blue-700 dark:text-brand-blue-300 dark:hover:text-brand-blue-200 transition-colors focus:outline-none focus-visible:underline';

export const authFieldIconClass =
  'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none';
