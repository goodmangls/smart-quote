import { render, screen } from '@testing-library/react';
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

  it('keeps Korean account-owner quote totals USD-only without KRW toggles', () => {
    render(<ResultSection {...defaultProps} hideMargin={true} isKorean={true} />);

    expect(screen.queryByRole('button', { name: 'Toggle currency display' })).not.toBeInTheDocument();
    expect(screen.getAllByText('$1,071.43').length).toBeGreaterThan(0);
    expect(screen.queryByText('₩1,500,000')).not.toBeInTheDocument();
    expect(screen.queryByText('KRW')).not.toBeInTheDocument();
  });

  it('keeps Korean account-owner carrier comparison and cost breakdown USD-only', () => {
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

    expect(screen.queryByRole('button', { name: /toggle currency/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('$1,071.43').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,071').length).toBeGreaterThan(0);
    expect(screen.queryByText('₩1,500,000')).not.toBeInTheDocument();
    expect(screen.queryByText('KRW')).not.toBeInTheDocument();
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

  it('keeps Korean account-owner PDF download USD-only', async () => {
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

    expect(screen.queryByRole('menuitem', { name: /krw currency/i })).not.toBeInTheDocument();
    expect(onDownloadPdf).toHaveBeenCalledWith('usd');
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
