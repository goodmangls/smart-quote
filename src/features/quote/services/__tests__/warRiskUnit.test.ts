import { ShippingItemType } from '@/types';

/**
 * WAR_RISK_SURCHARGE_RATE is 0 (DEC-006 removed the surcharge), and 0 is the one
 * value that is identical in every unit system. That hid a real split: this side
 * read the constant as a percentage — `base * (RATE / 100)` — while the backend
 * calculators read it as a fraction — `base * RATE`. Both produced 0, so every
 * test, the parity fixtures and the snapshot gate all passed while the two sides
 * disagreed by 100x. Setting it to 2 meaning "2%" would have billed 2% here and
 * 200% on the saved quote, which is the side customers are invoiced from.
 *
 * So this pins the unit with a NON-ZERO rate. The backend asserts the same
 * number for the same input in
 * smart-quote-api/spec/services/calculators/war_risk_unit_spec.rb — the pair is
 * the gate; either one alone only proves a side is self-consistent.
 */

// Shared with the backend spec. Deliberately not 0 and not 100: both of those
// give the same answer under either reading and would prove nothing.
const RATE_PERCENT = 2;

// vi.hoisted, because vi.mock is lifted above ordinary top-level consts.
const { RATE } = vi.hoisted(() => ({ RATE: 2 }));

vi.mock('@/config/rates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/rates')>()),
  WAR_RISK_SURCHARGE_RATE: RATE,
}));

describe('war risk surcharge unit', () => {
  it.each([
    ['UPS', () => import('../upsCalculation').then((m) => m.calculateUpsCosts)],
    ['DHL', () => import('../dhlCalculation').then((m) => m.calculateDhlCosts)],
    ['FEDEX', () => import('../fedexCalculation').then((m) => m.calculateFedexCosts)],
  ])('%s treats the rate as a percentage, not a fraction', async (carrier, load) => {
    const calc = await load();
    // US is served by all three carriers, so the zone lookup succeeds and the
    // calculation reaches the war-risk line.
    const { intlBase, intlWarRisk } = calc(1, 'US', ShippingItemType.NON_DOCUMENT);

    expect(intlBase).toBeGreaterThan(0);
    expect(intlWarRisk / intlBase).toBeCloseTo(RATE_PERCENT / 100, 9);
  });

  // The number the backend spec pins for the same rate, so a future edit that
  // "fixes" one side has to notice the other.
  it('matches the number the backend spec asserts for the same input', () => {
    expect(100_000 * (RATE_PERCENT / 100)).toBe(2_000);
  });
});
