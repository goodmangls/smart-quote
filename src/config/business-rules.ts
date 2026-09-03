export const SURGE_THRESHOLDS = {
  AHS_WEIGHT_KG: 25, // Additional Handling > 25kg
  AHS_DIM_LONG_SIDE_CM: 122, // Longest side > 122cm
  AHS_DIM_SECOND_SIDE_CM: 76, // Second longest > 76cm
  LPS_LENGTH_GIRTH_CM: 300, // Large Package: Length + 2W + 2H > 300cm
  MAX_LIMIT_LENGTH_CM: 274, // Over Max Limits
  MAX_LIMIT_GIRTH_CM: 400,
};

export const MAX_MARGIN_PERCENT = 80; // Maximum margin rate (%)

/**
 * Below this the quote is flagged for approval.
 *
 * Mirrors `quote_calculator.rb`'s Low Margin Alert — the two must agree, or a
 * saved quote reads as healthy on one side and flagged on the other. The number
 * lived inline in three places (the calculator warning, the history table's
 * colour, and nothing at all in the detail view) before it was pulled out here.
 */
export const LOW_MARGIN_THRESHOLD_PERCENT = 10;

export const isLowMargin = (profitMargin: number): boolean =>
  profitMargin < LOW_MARGIN_THRESHOLD_PERCENT;

export const PACKING_WEIGHT_BUFFER = 1.1; // 10% weight increase
export const PACKING_WEIGHT_ADDITION = 10; // 10kg addition per item
