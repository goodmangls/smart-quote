import type { Mock } from 'vitest';
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

  const utils = render(<MobileLayout {...defaultProps} {...props} />);
  return {
    ...utils,
    /** Re-render with the same defaults plus an override — e.g. a new carrier. */
    update: (next: Partial<React.ComponentProps<typeof MobileLayout>>) =>
      utils.rerender(<MobileLayout {...defaultProps} {...props} {...next} />),
  };
};

/**
 * Changing carrier scrolls the result into view after a short delay, so the
 * recalculated figures are on screen. The timer has to be cancelled when the
 * effect re-runs or the component unmounts: switching carriers quickly used to
 * stack one pending scroll per switch, and jsdom has no scrollIntoView, so an
 * uncancelled timer also throws after the test that scheduled it has finished.
 */
describe('MobileLayout carrier-change auto-scroll', () => {
  // jsdom has no scrollIntoView at all, so this is a stand-in rather than a spy.
  let scrollIntoView: Mock<(arg?: boolean | ScrollIntoViewOptions) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Three switches before any timer fires. Without a cleanup each one leaves its
  // own pending scroll, so the result jumps three times in a row.
  it('collapses rapid carrier switches into a single scroll', () => {
    const { update } = renderLayout();

    update({ input: { ...mockInput, overseasCarrier: 'DHL' } });
    update({ input: { ...mockInput, overseasCarrier: 'FEDEX' } });
    update({ input: { ...mockInput, overseasCarrier: 'UPS' } });
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('still scrolls for a single carrier change', () => {
    const { update } = renderLayout();

    update({ input: { ...mockInput, overseasCarrier: 'DHL' } });
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when nothing but the carrier stays put', () => {
    const { update } = renderLayout();

    update({ isDarkMode: true });
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

});

describe('MobileLayout sticky bar carrier badge', () => {
  const badgeFor = (carrier: 'UPS' | 'DHL' | 'FEDEX') => {
    renderLayout({
      input: { ...mockInput, overseasCarrier: carrier },
      result: { ...mockResult, carrier },
    });
    return screen.getByText(carrier);
  };

  // DESIGN.md §8.5 assigns each carrier a hue, and FedEx deliberately uses the
  // brand `cyan-*` scale rather than Tailwind's `blue-*`. The badge rendered
  // FedEx blue, so the same carrier looked different on mobile and desktop.
  it.each([
    ['UPS', 'amber'],
    ['DHL', 'yellow'],
    ['FEDEX', 'cyan'],
  ] as const)('renders the %s badge in its design-system hue (%s)', (carrier, hue) => {
    const badge = badgeFor(carrier);

    expect(badge.className).toContain(`bg-${hue}-100`);
    expect(badge.className).toContain(`text-${hue}-800`);
  });

  it('never uses the banned Tailwind blue/sky scales', () => {
    for (const carrier of ['UPS', 'DHL', 'FEDEX'] as const) {
      const { className } = badgeFor(carrier);
      expect(className).not.toMatch(/\b(bg|text|border)-(blue|sky)-\d/);
    }
  });
});

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
