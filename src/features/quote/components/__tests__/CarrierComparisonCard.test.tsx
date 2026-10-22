import { render } from '@testing-library/react';
import * as Sentry from '@sentry/browser';
import { CarrierComparisonCard } from '../CarrierComparisonCard';
import { calculateQuote, ZoneNotFoundError } from '@/features/quote/services/calculationService';
import { Incoterm, PackingType } from '@/types';
import type { QuoteInput, QuoteResult } from '@/types';
import type { ResolvedSurcharge } from '@/api/surchargeApi';

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));

vi.mock('@/features/quote/services/calculationService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/quote/services/calculationService')>();
  return {
    ...actual,
    calculateQuote: vi.fn(),
  };
});

// Values that match no constant in rates.ts, so a hardcoded default can't pass
// for the DB figure by coincidence.
const DB_FSC = {
  UPS: { international: 41.11, domestic: 41.11 },
  DHL: { international: 33.33, domestic: 33.33 },
  FEDEX: { international: 22.22, domestic: 22.22 },
};

vi.mock('@/features/dashboard/hooks/useFscRates', () => ({
  useFscRates: () => ({
    data: { rates: DB_FSC, updatedAt: '2026-10-06T00:00:00Z' },
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

const surcharge = (code: string, carrier: string, amount: number): ResolvedSurcharge => ({
  id: amount,
  code,
  name: code,
  name_ko: null,
  charge_type: 'fixed',
  amount,
  carrier,
  source_url: null,
  effective_from: '2026-01-01',
  effective_to: null,
});

const SURCHARGES_BY_CARRIER: Record<string, ResolvedSurcharge[]> = {
  UPS: [surcharge('UPS_WAR', 'UPS', 5_000)],
  DHL: [surcharge('DHL_PSS', 'DHL', 7_000)],
  FEDEX: [],
};

vi.mock('@/features/dashboard/hooks/useSurcharges', () => ({
  useSurcharges: (carrier: string) => ({
    surcharges: SURCHARGES_BY_CARRIER[carrier] ?? [],
    loading: false,
    error: null,
    lastUpdated: null,
    calculateApplied: vi.fn(),
    totalAmount: vi.fn(),
    retry: vi.fn(),
  }),
}));

const makeInput = (overrides: Partial<QuoteInput> = {}): QuoteInput =>
  ({
    originCountry: 'KR',
    destinationCountry: 'JP',
    destinationZip: '',
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 1 }],
    marginPercent: 15,
    dutyTaxEstimate: 0,
    exchangeRate: 1400,
    fscPercent: 0,
    overseasCarrier: 'UPS',
    ...overrides,
  }) as QuoteInput;

const makeResult = (overrides: Partial<QuoteResult> = {}): QuoteResult =>
  ({
    totalQuoteAmount: 100_000,
    totalCostAmount: 80_000,
    profitMargin: 20,
    billableWeight: 20,
    ...overrides,
  }) as QuoteResult;

describe('CarrierComparisonCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a failed carrier calculation to Sentry instead of swallowing it', () => {
    const error = new Error('FEDEX zone missing');
    vi.mocked(calculateQuote).mockImplementation((input: QuoteInput) => {
      if (input.overseasCarrier === 'FEDEX') throw error;
      return makeResult({ totalQuoteAmount: 90_000 });
    });

    const { container } = render(
      <CarrierComparisonCard
        input={makeInput()}
        currentResult={makeResult()}
        onSwitchCarrier={vi.fn()}
      />,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: expect.objectContaining({ carrier: 'FEDEX' }) }),
    );
    // The card still renders with the two carriers that did calculate.
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a "no zone" column instead of reporting when the destination is unmapped', () => {
    vi.mocked(calculateQuote).mockImplementation((input: QuoteInput) => {
      if (input.overseasCarrier === 'FEDEX') throw new ZoneNotFoundError('FEDEX', 'MM');
      return makeResult({ totalQuoteAmount: 90_000 });
    });

    const { getByText } = render(
      <CarrierComparisonCard
        input={makeInput({ destinationCountry: 'MM' })}
        currentResult={makeResult()}
        onSwitchCarrier={vi.fn()}
      />,
    );

    // Expected state, not a broken rate table: no Sentry noise, and the FedEx
    // column tells the user why there is no price.
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(getByText('comparison.noZone')).toBeInTheDocument();
  });

  it('reports each distinct failure only once across re-renders', () => {
    const error = new Error('DHL table corrupt');
    vi.mocked(calculateQuote).mockImplementation((input: QuoteInput) => {
      if (input.overseasCarrier === 'DHL') throw error;
      return makeResult();
    });

    const props = {
      input: makeInput(),
      currentResult: makeResult(),
      onSwitchCarrier: vi.fn(),
    };
    const { rerender } = render(<CarrierComparisonCard {...props} />);
    rerender(<CarrierComparisonCard {...props} input={makeInput({ marginPercent: 18 })} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  describe('the other carriers are priced on their own inputs', () => {
    const inputFor = (carrier: string): QuoteInput | undefined =>
      vi
        .mocked(calculateQuote)
        .mock.calls.map(([arg]) => arg)
        .find((arg) => arg.overseasCarrier === carrier);

    const renderFromUps = () => {
      vi.mocked(calculateQuote).mockReturnValue(makeResult());
      render(
        <CarrierComparisonCard
          input={makeInput({
            overseasCarrier: 'UPS',
            fscPercent: DB_FSC.UPS.international,
            resolvedSurcharges: [
              {
                code: 'UPS_WAR', name: 'UPS_WAR', nameKo: null,
                chargeType: 'fixed', amount: 5_000, sourceUrl: null,
              },
            ],
          })}
          currentResult={makeResult()}
          onSwitchCarrier={vi.fn()}
        />,
      );
    };

    it('uses the weekly FSC from the DB, not the rates.ts constant', () => {
      renderFromUps();

      expect(inputFor('DHL')?.fscPercent).toBe(DB_FSC.DHL.international);
      expect(inputFor('FEDEX')?.fscPercent).toBe(DB_FSC.FEDEX.international);
    });

    it("applies each carrier's own surcharges, not the selected carrier's", () => {
      renderFromUps();

      expect(inputFor('DHL')?.resolvedSurcharges?.map((s) => s.code)).toEqual(['DHL_PSS']);
      // FedEx has none — the UPS War Risk line must not ride along.
      expect(inputFor('FEDEX')?.resolvedSurcharges ?? []).toEqual([]);
    });
  });
});
