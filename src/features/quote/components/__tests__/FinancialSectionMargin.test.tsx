import { render, screen } from '@testing-library/react';
import { FinancialSection } from '../FinancialSection';
import { Incoterm, PackingType } from '@/types';
import type { QuoteInput } from '@/types';
import {
  ADMIN_DEFAULT_MARGIN_PERCENT,
  INITIAL_INPUT,
  initialInputFor,
} from '@/pages/quoteDefaults';

/**
 * Amounts picked so they collide with nothing real — not a rate in `rates.ts`,
 * not 15 (member default) and not 24 (the admin default this replaced). If the
 * hint ever rendered a hard-coded or stale figure these assertions would fail
 * rather than quietly agree with it.
 */
const MARGIN_AMOUNT = 313131;
const TOTAL_AMOUNT = 929292;

/**
 * The other FinancialSection suite mocks `t` as identity, which would strip the
 * {amount}/{total} placeholders and make the live line unassertable. Here `t`
 * returns the real templates so the interpolation itself is under test.
 */
const TEMPLATES: Record<string, string> = {
  'calc.financial.marginLive': 'Margin {amount} · Total {total}',
  'calc.financial.marginHint': 'The margin is set by the admin.',
  'calc.financial.marginZero': 'Margin 0% — quoting at cost.',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => TEMPLATES[key] ?? key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

const makeInput = (overrides: Partial<QuoteInput> = {}): QuoteInput =>
  ({
    originCountry: 'KR',
    destinationCountry: 'US',
    destinationZip: '10001',
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [{ id: '1', length: 30, width: 30, height: 30, weight: 10, quantity: 1 }],
    marginPercent: 7.7,
    dutyTaxEstimate: 0,
    exchangeRate: 1400,
    fscPercent: 30,
    overseasCarrier: 'UPS',
    ...overrides,
  }) as QuoteInput;

const renderSection = (
  overrides: Partial<QuoteInput> = {},
  props: Partial<React.ComponentProps<typeof FinancialSection>> = {},
) =>
  render(
    <FinancialSection
      input={makeInput(overrides)}
      onFieldChange={vi.fn()}
      isMobileView={false}
      marginAmount={MARGIN_AMOUNT}
      totalQuoteAmount={TOTAL_AMOUNT}
      {...props}
    />,
  );

describe('Target Margin — admin default', () => {
  it('starts an admin quote at 0%', () => {
    expect(ADMIN_DEFAULT_MARGIN_PERCENT).toBe(0);
  });

  it('leaves the member default alone', () => {
    // The change was scoped to admins. If this moves, members silently started
    // quoting at a different margin too.
    expect(INITIAL_INPUT.marginPercent).toBe(15);
  });

  it('still starts an admin at 0 after a reset', () => {
    // Reset calls initialInputFor, not INITIAL_INPUT, because the admin default
    // is applied by an effect keyed on isAdmin that does NOT re-fire on reset.
    // Going through INITIAL_INPUT put the admin back on the member's 15%.
    expect(initialInputFor(true).marginPercent).toBe(ADMIN_DEFAULT_MARGIN_PERCENT);
    expect(initialInputFor(true).marginPercent).toBe(0);
  });

  it('resets a member to the member default', () => {
    expect(initialInputFor(false).marginPercent).toBe(15);
  });

  it('changes nothing but the margin when resetting an admin', () => {
    // Every other field must survive the role branch — an admin reset should not
    // quietly pick a different carrier, incoterm or exchange rate.
    expect(initialInputFor(true)).toEqual({
      ...INITIAL_INPUT,
      marginPercent: ADMIN_DEFAULT_MARGIN_PERCENT,
    });
  });
});

describe('Target Margin — dynamic quote linkage', () => {
  it('shows what the current margin produces and what the customer is quoted', () => {
    renderSection();

    // Formatted, so a raw-number regression (313131 vs ₩313,131) is caught too.
    expect(screen.getByText(/313,131/)).toBeInTheDocument();
    expect(screen.getByText(/929,292/)).toBeInTheDocument();
  });

  it('says the margin is the admin’s to set', () => {
    renderSection();

    expect(screen.getByText(/The margin is set by the admin/)).toBeInTheDocument();
  });

  it('calls out that a 0% margin is quoting at cost', () => {
    renderSection({ marginPercent: 0 });

    expect(screen.getByText(/quoting at cost/)).toBeInTheDocument();
    expect(screen.queryByText(/The margin is set by the admin/)).not.toBeInTheDocument();
  });

  it('omits the live figures until a quote has been calculated', () => {
    renderSection({}, { marginAmount: undefined, totalQuoteAmount: undefined });

    expect(screen.queryByText(/313,131/)).not.toBeInTheDocument();
  });

  it('shows nothing margin-related to a member', () => {
    renderSection({}, { hideMargin: true });

    expect(screen.queryByText(/313,131/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The margin is set by the admin/)).not.toBeInTheDocument();
  });

  it('labels a resolved rule as reference only, never as applied', () => {
    // Admin quotes skip auto-resolution, so calling this "적용" would contradict
    // the number actually sitting in the field.
    renderSection(
      {},
      {
        resolvedMargin: {
          marginPercent: 19,
          fallback: false,
          matchedRule: { name: 'KR-heavy' },
        } as never,
      },
    );

    expect(screen.getByText(/Reference rule/)).toBeInTheDocument();
    expect(screen.queryByText(/^Rule:/)).not.toBeInTheDocument();
  });
});
