import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveQuoteButton } from '../SaveQuoteButton';
import { QuoteInput, QuoteResult, Incoterm, PackingType } from '@/types';

vi.mock('@/api/quoteApi', () => ({
  saveQuote: vi.fn(),
}));

const { authState, toastSpy } = vi.hoisted(() => ({
  authState: {
    user: {
      id: 1,
      email: 'test@company.com',
      role: 'member',
      company: 'Test Corp',
      name: 'Test User',
      nationality: undefined as string | undefined,
    },
  },
  toastSpy: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, isAuthenticated: true }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('@/lib/intercom', () => ({
  trackEvent: vi.fn(),
  IntercomEvents: { QuoteSaved: 'quote_saved' },
}));

import { saveQuote } from '@/api/quoteApi';
import { trackEvent } from '@/lib/intercom';

const mockInput: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '10001',
  incoterm: Incoterm.FOB,
  packingType: PackingType.NONE,
  items: [{ id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }],
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: 1300,
  fscPercent: 27.5,
};

const mockResult: QuoteResult = {
  totalQuoteAmount: 185000,
  totalQuoteAmountUSD: 142.31,
  totalCostAmount: 135000,
  profitAmount: 50000,
  profitMargin: 27.0,
  currency: 'KRW',
  totalActualWeight: 1,
  totalVolumetricWeight: 0.2,
  billableWeight: 1,
  appliedZone: '8',
  transitTime: '3-5 days',
  carrier: 'UPS',
  warnings: [],
  breakdown: {
    packingMaterial: 0,
    packingLabor: 0,
    packingFumigation: 0,
    handlingFees: 0,
    pickupInSeoul: 0,
    intlBase: 50000,
    intlFsc: 5000,
    intlWarRisk: 2500,
    intlSurge: 0,
    destDuty: 0,
    totalCost: 57500,
  },
};

describe('SaveQuoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user.nationality = undefined;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows Save Quote button initially', () => {
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    expect(screen.getByText('Save Quote')).toBeInTheDocument();
  });

  it('disables Save button when result is null', () => {
    render(<SaveQuoteButton input={mockInput} result={null} />);

    const button = screen.getByText('Save Quote').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('disables Save button when items are empty', () => {
    const emptyInput = { ...mockInput, items: [] };
    render(<SaveQuoteButton input={emptyInput} result={mockResult} />);

    const button = screen.getByText('Save Quote').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('shows notes input after clicking Save Quote', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));

    expect(
      screen.getByPlaceholderText('Add notes (optional)'),
    ).toBeInTheDocument();
  });

  it('calls saveQuote API on confirm', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0001' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(saveQuote).toHaveBeenCalledWith(mockInput, undefined);
  });

  it('shows Saved! with reference number after successful save', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0042' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Saved!/)).toBeInTheDocument();
      expect(screen.getByText(/SQ-2026-0042/)).toBeInTheDocument();
    });
  });

  it('shows View button after save when onSaved is provided', async () => {
    vi.useRealTimers();
    const onSaved = vi.fn();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0042' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} onSaved={onSaved} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('View'));
    expect(onSaved).toHaveBeenCalledWith('SQ-2026-0042');
  });

  it('shows Failed to save on error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(saveQuote).mockRejectedValue(new Error('Network error'));

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await user.click(screen.getByText('Save Quote'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await vi.advanceTimersByTimeAsync(100);

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });

  it('cancel button hides notes input', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    expect(
      screen.getByPlaceholderText('Add notes (optional)'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Save Quote')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Add notes (optional)'),
    ).not.toBeInTheDocument();
  });

  it('pressing Enter in notes input triggers save', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0099' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    const notesInput = screen.getByPlaceholderText('Add notes (optional)');
    await userEvent.type(notesInput, 'rush order');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(saveQuote).toHaveBeenCalledWith(mockInput, 'rush order');
    });
  });

  it('pressing Escape in notes input closes notes and clears input', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    const notesInput = screen.getByPlaceholderText('Add notes (optional)');
    await userEvent.type(notesInput, 'some note');
    await userEvent.keyboard('{Escape}');

    expect(screen.getByText('Save Quote')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Add notes (optional)'),
    ).not.toBeInTheDocument();
  });

  it('shows duplicate confirm dialog when saving same input twice', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0050' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    // First save
    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Saved!/)).toBeInTheDocument();
    });

    // Advance past the 4s idle reset timer
    await act(async () => { vi.advanceTimersByTime(5000); });

    await waitFor(() => {
      expect(screen.getByText('Save Quote')).toBeInTheDocument();
    });

    // Second save with same input -> should show duplicate dialog
    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Duplicate Quote')).toBeInTheDocument();
      expect(screen.getByText('This quote was already saved. Save again?')).toBeInTheDocument();
      expect(screen.getByText('Save Again')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  // The server sets a non-admin's margin from their margin rule when it saves
  // (POST /quotes). If the page had not finished resolving that rule — or the
  // lookup failed and it fell back — the saved price differs from the one on
  // screen, and the member must be told which one was saved.
  describe('when the saved total differs from the one on screen', () => {
    type Detail = Awaited<ReturnType<typeof saveQuote>>;
    const saveAndConfirm = async () => {
      render(<SaveQuoteButton input={mockInput} result={mockResult} />);
      await userEvent.click(screen.getByText('Save Quote'));
      await userEvent.click(screen.getByRole('button', { name: /save/i }));
    };

    it('warns with the saved USD amount for a non-Korean member', async () => {
      vi.useRealTimers();
      vi.mocked(saveQuote).mockResolvedValue({
        referenceNo: 'SQ-2026-0100',
        totalQuoteAmount: 201000,
        totalQuoteAmountUSD: 154.62,
      } as Detail);

      await saveAndConfirm();

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('warning', expect.stringContaining('$154.62'));
      });
      const warning = toastSpy.mock.calls.find(([type]) => type === 'warning')![1] as string;
      expect(warning).toContain('SQ-2026-0100');
      expect(warning).not.toContain('₩');
    });

    it('warns with the saved KRW amount for a Korean member', async () => {
      vi.useRealTimers();
      authState.user.nationality = 'KR';
      vi.mocked(saveQuote).mockResolvedValue({
        referenceNo: 'SQ-2026-0101',
        totalQuoteAmount: 201000,
        totalQuoteAmountUSD: 154.62,
      } as Detail);

      await saveAndConfirm();

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith('warning', expect.stringContaining('₩201,000'));
      });
    });

    it('reports the saved amount, not the on-screen one, to Intercom', async () => {
      vi.useRealTimers();
      vi.mocked(saveQuote).mockResolvedValue({
        referenceNo: 'SQ-2026-0103',
        totalQuoteAmount: 201000,
        totalQuoteAmountUSD: 154.62,
      } as Detail);

      await saveAndConfirm();

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith(
          'quote_saved',
          expect.objectContaining({ reference_no: 'SQ-2026-0103', total_krw: 201000 }),
        );
      });
    });

    it('does not warn when the saved total matches the screen', async () => {
      vi.useRealTimers();
      vi.mocked(saveQuote).mockResolvedValue({
        referenceNo: 'SQ-2026-0102',
        totalQuoteAmount: mockResult.totalQuoteAmount,
        totalQuoteAmountUSD: mockResult.totalQuoteAmountUSD,
      } as Detail);

      await saveAndConfirm();

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('success', expect.any(String)));
      expect(toastSpy).not.toHaveBeenCalledWith('warning', expect.anything());
    });
  });
});

