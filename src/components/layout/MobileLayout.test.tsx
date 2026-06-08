import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileLayout } from './MobileLayout';
import { Incoterm, PackingType, QuoteInput, QuoteResult } from '@/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/features/quote/components/InputSection', () => ({
  InputSection: () => <div data-testid="input-section" />,
}));

vi.mock('@/features/quote/components/ResultSection', () => ({
  ResultSection: () => <div data-testid="result-section" />,
}));

vi.mock('@/pages/components/AdminWidgets', () => ({
  AdminWidgets: () => <div data-testid="admin-widgets" />,
}));

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

const mockResult: QuoteResult = {
  totalQuoteAmount: 1500000,
  totalQuoteAmountUSD: 1071.43,
  totalCostAmount: 1200000,
  profitAmount: 300000,
  profitMargin: 20,
  currency: 'KRW',
  billableWeight: 15.5,
  totalActualWeight: 10,
  totalVolumetricWeight: 12,
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

const renderLayout = (props?: Partial<React.ComponentProps<typeof MobileLayout>>) => {
  const defaultProps: React.ComponentProps<typeof MobileLayout> = {
    isDarkMode: false,
    setIsDarkMode: vi.fn(),
    isMobileView: true,
    setIsMobileView: vi.fn(),
    input: mockInput,
    setInput: vi.fn(),
    result: mockResult,
    onMarginChange: vi.fn(),
    onDownloadPdf: vi.fn(),
    onReset: vi.fn(),
    scrollToResults: vi.fn(),
    hideMargin: true,
    isAdmin: false,
    isKorean: false,
  };

  return render(<MobileLayout {...defaultProps} {...props} />);
};

describe('MobileLayout sticky quote bar currency policy', () => {
  it('keeps non-Korean account-owner sticky totals USD-only and downloads USD PDF', async () => {
    const user = userEvent.setup();
    const onDownloadPdf = vi.fn();

    renderLayout({ isKorean: false, onDownloadPdf });

    const stickyBar = screen.getByText('calc.totalEstimate').closest('div')!.parentElement!.parentElement!;
    expect(within(stickyBar).getByText('$1,071')).toBeInTheDocument();
    expect(within(stickyBar).queryByText(/₩/)).not.toBeInTheDocument();

    await user.click(within(stickyBar).getByRole('button', { name: /download pdf/i }));
    expect(onDownloadPdf).toHaveBeenCalledWith('usd');
  });

  it('shows Korean account-owner sticky totals in KRW with USD reference and downloads KRW PDF', async () => {
    const user = userEvent.setup();
    const onDownloadPdf = vi.fn();

    renderLayout({ isKorean: true, onDownloadPdf });

    const stickyBar = screen.getByText('calc.totalEstimate').closest('div')!.parentElement!.parentElement!;
    expect(within(stickyBar).getByText('₩1,500,000')).toBeInTheDocument();
    expect(within(stickyBar).getByText(/\$1,071/)).toBeInTheDocument();

    await user.click(within(stickyBar).getByRole('button', { name: /download pdf/i }));
    expect(onDownloadPdf).toHaveBeenCalledWith('krw');
  });
});
