import { render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import userEvent from '@testing-library/user-event';
import { QuoteHistoryTable } from '../QuoteHistoryTable';
import { QuoteSummary } from '@/types';

// Components read labels through useLanguage(); the real provider defaults to
// English, so the assertions below still read the English strings.
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: LanguageProvider });

const mockQuote: QuoteSummary = {
  id: 1,
  referenceNo: 'SQ-2026-0001',
  destinationCountry: 'US',
  totalQuoteAmount: 1500000,
  totalQuoteAmountUsd: 1150.5,
  profitMargin: 20.0,
  billableWeight: 15.5,
  status: 'draft',
  validityDate: '2026-02-21',
  createdAt: '2026-02-14T00:00:00Z',
};

const defaultProps = {
  quotes: [mockQuote],
  isLoading: false,
  hasActiveFilters: false,
  onView: vi.fn(),
  onDelete: vi.fn(),
  // These cases cover the ADMIN view. `hideMargin` now defaults to true
  // (deny by default), so the role has to be stated rather than assumed —
  // margin and cost are admin-only. The member view is covered in
  // MarginVisibility.test.tsx.
  hideMargin: false,
};

describe('QuoteHistoryTable', () => {
  it('renders table headers', () => {
    render(<QuoteHistoryTable {...defaultProps} />);

    expect(screen.getByText('Ref No')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Dest')).toBeInTheDocument();
    expect(screen.getByText('Amount (KRW)')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders quote rows with formatted data', () => {
    render(<QuoteHistoryTable {...defaultProps} />);

    // Both mobile card and desktop table render — use getAllByText
    expect(screen.getAllByText('SQ-2026-0001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('US').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,500,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,150.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20.0%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
  });

  it('shows loading skeletons when isLoading is true', () => {
    const { container } = render(<QuoteHistoryTable {...defaultProps} quotes={[]} isLoading={true} />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty message when no quotes and no filters', () => {
    render(
      <QuoteHistoryTable
        {...defaultProps}
        quotes={[]}
        hasActiveFilters={false}
      />,
    );

    // Rendered in both mobile and desktop views
    expect(
      screen.getAllByText('No quotes saved yet. Calculate a quote and save it!').length,
    ).toBeGreaterThan(0);
  });

  it('shows filter message when no quotes and hasActiveFilters', () => {
    render(
      <QuoteHistoryTable
        {...defaultProps}
        quotes={[]}
        hasActiveFilters={true}
      />,
    );

    expect(
      screen.getAllByText('No quotes match your filters.').length,
    ).toBeGreaterThan(0);
  });

  it('calls onView with correct id when view button clicked', async () => {
    const onView = vi.fn();
    render(<QuoteHistoryTable {...defaultProps} onView={onView} />);

    const viewButtons = screen.getAllByLabelText('View detail');
    await userEvent.click(viewButtons[0]);

    expect(onView).toHaveBeenCalledWith(1);
  });

  it('calls onDelete with correct id and refNo when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(<QuoteHistoryTable {...defaultProps} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByLabelText('Delete');
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith(1, 'SQ-2026-0001');
  });
});

describe('QuoteHistoryTable language', () => {
  afterEach(() => localStorage.removeItem('smartQuoteLanguage'));

  // The whole history screen used to be hard-coded English, so an admin who
  // switched to Korean saw Korean everywhere else and English here.
  it('follows the selected language', () => {
    localStorage.setItem('smartQuoteLanguage', 'ko');
    render(<QuoteHistoryTable {...defaultProps} quotes={[{ ...mockQuote, surchargeStale: true }]} />);

    expect(screen.getAllByText('견적번호').length).toBeGreaterThan(0);
    expect(screen.getAllByText('초안').length).toBeGreaterThan(0);
    expect(screen.getAllByText('재확인').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ref No')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  // The stale-surcharge badge was the reverse case: Korean "재확인" for everyone.
  it('no longer shows Korean to an English reader', () => {
    render(<QuoteHistoryTable {...defaultProps} quotes={[{ ...mockQuote, surchargeStale: true }]} />);

    expect(screen.getAllByText('Recheck').length).toBeGreaterThan(0);
    expect(screen.queryByText('재확인')).not.toBeInTheDocument();
  });
});
