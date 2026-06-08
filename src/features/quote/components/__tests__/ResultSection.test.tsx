import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultSection } from '../ResultSection';
import { QuoteInput, QuoteResult, Incoterm, PackingType } from '@/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/features/dashboard/hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null,
    isStale: false,
    retry: vi.fn(),
  }),
}));

vi.mock('@/features/dashboard/hooks/usePortWeather', () => ({
  usePortWeather: () => ({ data: [], loading: false, error: null }),
}));

const mockCalculateQuote = vi.fn<() => QuoteResult | null>(() => null);
vi.mock('@/features/quote/services/calculationService', () => ({
  calculateQuote: () => mockCalculateQuote(),
}));

vi.mock('@/lib/pdfService', () => ({
  generateComparisonPDF: vi.fn(),
}));

const mockResult: QuoteResult = {
  totalQuoteAmount: 1500000,
  totalQuoteAmountUSD: 1071.43,
  totalCostAmount: 1200000,
  profitAmount: 300000,
  profitMargin: 20.0,
  currency: 'KRW',
  billableWeight: 15.5,
  totalActualWeight: 10.0,
  totalVolumetricWeight: 12.0,
  appliedZone: 'Z5',
  carrier: 'UPS',
  transitTime: '3-5 days',
  warnings: [],
  breakdown: {
    packingMaterial: 5000,
    packingLabor: 3000,
    packingFumigation: 0,
    handlingFees: 10000,
    pickupInSeoul: 0,
    intlBase: 80000,
    intlFsc: 24000,
    intlWarRisk: 0,
    intlSurge: 0,
    destDuty: 0,
    totalCost: 122000,
  },
};

const mockInput: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '10001',
  incoterm: Incoterm.DAP,
  packingType: PackingType.NONE,
  items: [{ id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }],
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: 1400,
  fscPercent: 30,
  overseasCarrier: 'UPS',
};

const defaultProps = {
  result: mockResult,
  onMarginChange: vi.fn(),
  onDownloadPdf: vi.fn<(currency?: 'krw' | 'usd') => void>(),
  marginPercent: 15,
};

describe('ResultSection', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders quote summary card with amount', () => {
    render(<ResultSection {...defaultProps} />);

    // QuoteSummaryCard shows the formatted total amount
    expect(screen.getByText('calc.totalEstimate')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders the localized customs & duties disclaimer keys in the breakdown footer', () => {
    render(<ResultSection {...defaultProps} />);

    expect(screen.getByText(/quote\.disclaimer\.customsTitle/)).toBeInTheDocument();
    expect(screen.getByText('quote.disclaimer.customsBody')).toBeInTheDocument();
  });

  it('renders key metrics (Act. Weight, Bill. Weight, Margin)', () => {
    render(<ResultSection {...defaultProps} />);

    expect(screen.getByText('Act. Weight')).toBeInTheDocument();
    expect(screen.getByText('Bill. Weight')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('hides margin metric when hideMargin=true', () => {
    render(<ResultSection {...defaultProps} hideMargin={true} />);

    expect(screen.getByText('Act. Weight')).toBeInTheDocument();
    expect(screen.getByText('Bill. Weight')).toBeInTheDocument();
    expect(screen.queryByText('Margin')).not.toBeInTheDocument();
  });

  it('defaults Korean account-owner quote totals to KRW and toggles to USD on click', async () => {
    const user = userEvent.setup();

    render(<ResultSection {...defaultProps} hideMargin={true} isKorean={true} />);

    const currencyToggle = screen.getByRole('button', { name: 'Toggle currency display' });
    expect(within(currencyToggle).getByText('₩1,500,000')).toBeInTheDocument();
    expect(within(currencyToggle).getByText('$1,071.43')).toBeInTheDocument();
    expect(within(currencyToggle).getByText('USD')).toBeInTheDocument();

    await user.click(currencyToggle);

    expect(within(currencyToggle).getByText('$1,071.43')).toBeInTheDocument();
    expect(within(currencyToggle).getByText('₩1,500,000')).toBeInTheDocument();
    expect(within(currencyToggle).getByText('KRW')).toBeInTheDocument();
  });

  it('shows KRW-default currency toggles in carrier comparison and cost breakdown for Korean account owners', async () => {
    const user = userEvent.setup();
    mockCalculateQuote.mockReturnValue({
      ...mockResult,
      carrier: 'DHL',
      totalQuoteAmount: 1600000,
      totalQuoteAmountUSD: 1142.86,
    });

    render(
      <ResultSection
        {...defaultProps}
        input={mockInput}
        onSwitchCarrier={vi.fn()}
        hideMargin={true}
        isKorean={true}
      />,
    );

    const comparison = screen.getByText('comparison.title').closest('div')!.parentElement!.parentElement!;
    const breakdown = screen.getByText('quote.logisticsCost').closest('div')!.parentElement!;

    expect(within(comparison).getByRole('button', { name: /toggle currency/i })).toHaveTextContent('KRW');
    expect(within(comparison).getByText('₩1,500,000')).toBeInTheDocument();
    expect(within(breakdown).getByRole('button', { name: /toggle currency/i })).toHaveTextContent('KRW');
    expect(within(breakdown).getByText('₩1,500,000')).toBeInTheDocument();

    await user.click(within(comparison).getByRole('button', { name: /toggle currency/i }));
    await user.click(within(breakdown).getByRole('button', { name: /toggle currency/i }));

    expect(within(comparison).getByText('$1,071')).toBeInTheDocument();
    expect(within(breakdown).getByText('$1,071.43')).toBeInTheDocument();
  });

  it('keeps non-Korean account-owner widgets USD-only without KRW toggles', () => {
    mockCalculateQuote.mockReturnValue({
      ...mockResult,
      carrier: 'DHL',
      totalQuoteAmount: 1600000,
      totalQuoteAmountUSD: 1142.86,
    });

    render(
      <ResultSection
        {...defaultProps}
        input={mockInput}
        onSwitchCarrier={vi.fn()}
        hideMargin={true}
        isKorean={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /toggle currency/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('$1,071.43').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,071').length).toBeGreaterThan(0);
    expect(screen.queryByText('₩1,500,000')).not.toBeInTheDocument();
  });

  it('renders warning alerts when warnings present', () => {
    const resultWithWarnings = {
      ...mockResult,
      warnings: ['Low margin detected', 'Heavy package surcharge'],
    };
    render(<ResultSection {...defaultProps} result={resultWithWarnings} />);

    expect(screen.getByText('Attention Needed')).toBeInTheDocument();
    expect(screen.getByText('Low margin detected')).toBeInTheDocument();
    expect(screen.getByText('Heavy package surcharge')).toBeInTheDocument();
  });

  it('does not render warnings when empty', () => {
    render(<ResultSection {...defaultProps} />);

    expect(screen.queryByText('Attention Needed')).not.toBeInTheDocument();
  });

  it('calls onDownloadPdf when PDF button clicked', async () => {
    const onDownloadPdf = vi.fn();
    const user = userEvent.setup();
    render(<ResultSection {...defaultProps} onDownloadPdf={onDownloadPdf} />);

    await user.click(screen.getByText('PDF'));
    expect(onDownloadPdf).toHaveBeenCalledWith(undefined);
  });

  it('lets Korean account owners choose KRW or USD PDF currency', async () => {
    const onDownloadPdf = vi.fn();
    const user = userEvent.setup();

    render(
      <ResultSection
        {...defaultProps}
        onDownloadPdf={onDownloadPdf}
        hideMargin={true}
        isKorean={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: /download pdf/i }));
    await user.click(screen.getByRole('menuitem', { name: /krw currency/i }));
    await user.click(screen.getByRole('button', { name: /download pdf/i }));
    await user.click(screen.getByRole('menuitem', { name: /usd currency/i }));

    expect(onDownloadPdf).toHaveBeenNthCalledWith(1, 'krw');
    expect(onDownloadPdf).toHaveBeenNthCalledWith(2, 'usd');
  });

  it('keeps non-Korean account-owner PDF download USD-only', async () => {
    const onDownloadPdf = vi.fn();
    const user = userEvent.setup();

    render(
      <ResultSection
        {...defaultProps}
        onDownloadPdf={onDownloadPdf}
        hideMargin={true}
        isKorean={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(screen.queryByRole('menuitem', { name: /krw currency/i })).not.toBeInTheDocument();
    expect(onDownloadPdf).toHaveBeenCalledWith('usd');
  });

  it('renders carrier comparison when input and onSwitchCarrier provided', () => {
    mockCalculateQuote.mockReturnValue({
      ...mockResult,
      carrier: 'DHL',
      totalQuoteAmount: 1600000,
      totalQuoteAmountUSD: 1142.86,
    });

    render(<ResultSection {...defaultProps} input={mockInput} onSwitchCarrier={vi.fn()} />);

    expect(screen.getByText('comparison.title')).toBeInTheDocument();
  });

  it('renders carrier comparison even when hideMargin is true', () => {
    mockCalculateQuote.mockReturnValue({
      ...mockResult,
      carrier: 'DHL',
      totalQuoteAmount: 1600000,
      totalQuoteAmountUSD: 1142.86,
    });

    render(
      <ResultSection
        {...defaultProps}
        input={mockInput}
        onSwitchCarrier={vi.fn()}
        hideMargin={true}
      />,
    );

    expect(screen.getByText('comparison.title')).toBeInTheDocument();
  });
});
