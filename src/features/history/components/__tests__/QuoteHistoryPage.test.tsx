import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteHistoryPage } from '../QuoteHistoryPage';
import * as quoteApi from '@/api/quoteApi';

vi.mock('@/api/quoteApi', () => ({
  listQuotes: vi.fn().mockResolvedValue({
    quotes: [],
    pagination: { totalCount: 0, totalPages: 0, currentPage: 1, perPage: 20 },
  }),
  getQuote: vi.fn(),
  deleteQuote: vi.fn(),
  exportQuotes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
}));

describe('QuoteHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial listQuotes call carries amountCurrency=KRW', async () => {
    render(<QuoteHistoryPage />);
    await waitFor(() => {
      expect(quoteApi.listQuotes).toHaveBeenCalled();
    });
    const firstCallArgs = (quoteApi.listQuotes as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0];
    expect(firstCallArgs[0]).toMatchObject({ amountCurrency: 'KRW' });
  });

  it('exports csv via dropdown', async () => {
    const user = userEvent.setup();
    render(<QuoteHistoryPage />);
    await user.click(await screen.findByRole('button', { name: /Export/i }));
    await user.click(screen.getByRole('menuitem', { name: 'CSV' }));
    await waitFor(() => {
      expect(quoteApi.exportQuotes).toHaveBeenCalledWith(
        expect.objectContaining({ amountCurrency: 'KRW' }),
        'csv',
      );
    });
  });

  it('exports xlsx via dropdown', async () => {
    const user = userEvent.setup();
    render(<QuoteHistoryPage />);
    await user.click(await screen.findByRole('button', { name: /Export/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Excel' }));
    await waitFor(() => {
      expect(quoteApi.exportQuotes).toHaveBeenCalledWith(
        expect.objectContaining({ amountCurrency: 'KRW' }),
        'xlsx',
      );
    });
  });
});
