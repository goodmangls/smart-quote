import { render } from '@testing-library/react';
import * as Sentry from '@sentry/browser';
import { CarrierComparisonCard } from '../CarrierComparisonCard';
import { calculateQuote, ZoneNotFoundError } from '@/features/quote/services/calculationService';
import { Incoterm, PackingType } from '@/types';
import type { QuoteInput, QuoteResult } from '@/types';

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
});
