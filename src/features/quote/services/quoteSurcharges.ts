import { QuoteInput, CostBreakdown } from '@/types';

type AppliedSurcharges = NonNullable<CostBreakdown['appliedSurcharges']>;

export interface SystemSurchargeResult {
  total: number;
  /**
   * Left undefined — not [] — when nothing applies, because the breakdown field is
   * optional and consumers (PDF, detail modal, saved-quote payload) distinguish
   * "no surcharge section" from "an empty one".
   */
  applied?: AppliedSurcharges;
}

/**
 * Resolves DB-driven surcharges (War Risk, PSS, EBS, …) against a carrier base rate.
 *
 * `rate` surcharges are a percentage of the base rate; `fixed` ones are a KRW amount.
 * Each line is rounded on its own before summing, so the total is the sum of the
 * displayed line amounts rather than a rounded sum — the two differ, and the
 * displayed lines are what a customer adds up.
 */
export const computeSystemSurcharges = (
  resolved: QuoteInput['resolvedSurcharges'],
  intlBase: number,
): SystemSurchargeResult => {
  if (!resolved || resolved.length === 0) return { total: 0 };

  const applied: AppliedSurcharges = resolved.map((s) => ({
    code: s.code,
    name: s.name,
    nameKo: s.nameKo ?? undefined,
    chargeType: s.chargeType,
    amount: s.amount,
    appliedAmount:
      s.chargeType === 'rate' ? Math.round((intlBase * s.amount) / 100) : Math.round(s.amount),
    sourceUrl: s.sourceUrl ?? undefined,
  }));

  return {
    total: applied.reduce((sum, s) => sum + s.appliedAmount, 0),
    applied,
  };
};
