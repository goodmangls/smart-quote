import { describe, it, expect } from 'vitest';
import { computeSystemSurcharges } from './quoteSurcharges';
import { QuoteInput } from '@/types';

type Surcharges = NonNullable<QuoteInput['resolvedSurcharges']>;

const fixed = (amount: number, over: Partial<Surcharges[number]> = {}): Surcharges[number] => ({
  code: 'PSS',
  name: 'Peak Season',
  nameKo: null,
  chargeType: 'fixed',
  amount,
  sourceUrl: null,
  ...over,
});

const rate = (amount: number, over: Partial<Surcharges[number]> = {}): Surcharges[number] =>
  fixed(amount, { code: 'EBS', name: 'Emergency', chargeType: 'rate', ...over });

describe('computeSystemSurcharges', () => {
  describe('empty input yields no surcharge section', () => {
    it('returns total 0 and undefined applied when the list is missing', () => {
      expect(computeSystemSurcharges(undefined, 1_000_000)).toEqual({ total: 0 });
    });

    it('returns undefined applied — not [] — for an empty list', () => {
      const result = computeSystemSurcharges([], 1_000_000);
      expect(result.total).toBe(0);
      // The breakdown field is optional; [] would render an empty surcharge section.
      expect(result.applied).toBeUndefined();
    });
  });

  describe('charge types', () => {
    it('bills a fixed surcharge at its KRW amount, independent of the base rate', () => {
      expect(computeSystemSurcharges([fixed(12_345)], 1_000_000).total).toBe(12_345);
      expect(computeSystemSurcharges([fixed(12_345)], 9_000_000).total).toBe(12_345);
    });

    it('bills a rate surcharge as a percentage of the carrier base rate', () => {
      expect(computeSystemSurcharges([rate(7.5)], 1_000_000).total).toBe(75_000);
    });

    it('rounds a fractional fixed amount', () => {
      expect(computeSystemSurcharges([fixed(100.6)], 1_000_000).total).toBe(101);
    });

    it('rounds a fractional rate result', () => {
      // 3.33% of 1,000 = 33.3
      expect(computeSystemSurcharges([rate(3.33)], 1_000).total).toBe(33);
    });
  });

  describe('totalling', () => {
    it('sums the rounded line amounts, not the rounded sum', () => {
      // Each line rounds to 34 (33.5 → 34), so the total is 68 — not round(67) = 67.
      const result = computeSystemSurcharges([fixed(33.5), fixed(33.5)], 1_000_000);
      expect(result.total).toBe(68);
      expect(result.applied?.map((s) => s.appliedAmount)).toEqual([34, 34]);
    });

    it('mixes fixed and rate lines', () => {
      const result = computeSystemSurcharges([fixed(50_000), rate(10)], 2_000_000);
      expect(result.total).toBe(250_000);
    });
  });

  describe('passthrough fields', () => {
    it('normalizes null nameKo and sourceUrl to undefined', () => {
      const [line] = computeSystemSurcharges([fixed(1_000)], 1_000_000).applied ?? [];
      expect(line.nameKo).toBeUndefined();
      expect(line.sourceUrl).toBeUndefined();
    });

    it('keeps supplied nameKo and sourceUrl', () => {
      const [line] =
        computeSystemSurcharges(
          [fixed(1_000, { nameKo: '성수기', sourceUrl: 'https://example.test' })],
          1_000_000,
        ).applied ?? [];
      expect(line.nameKo).toBe('성수기');
      expect(line.sourceUrl).toBe('https://example.test');
    });

    it('reports the declared amount alongside the applied amount', () => {
      const [line] = computeSystemSurcharges([rate(7.5)], 1_000_000).applied ?? [];
      expect(line).toMatchObject({ code: 'EBS', chargeType: 'rate', amount: 7.5, appliedAmount: 75_000 });
    });
  });
});
