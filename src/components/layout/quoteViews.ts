export type AppView = 'calculator' | 'history';

/** The single panel both view tabs control — rendered by QuoteCalculator. */
export const VIEW_PANEL_ID = 'quote-view-panel';
export const viewTabId = (view: AppView): string => `quote-view-tab-${view}`;
