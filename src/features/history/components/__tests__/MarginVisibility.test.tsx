import { render, screen } from '@testing-library/react';
import { DesktopQuoteTable } from '../DesktopQuoteTable';
import { MobileQuoteTable } from '../MobileQuoteTable';
import type { QuoteSummary } from '@/types';

/**
 * Margin is admin-only. The API already withholds it (see
 * `quote_margin_visibility_spec.rb`); these pin the UI half so a member never
 * sees a margin column — and so an admin never loses one.
 *
 * 33.3 is chosen because it appears nowhere in the fixtures or in rates.ts.
 */
const MARGIN = 33.3;

const makeQuote = (overrides: Partial<QuoteSummary> = {}): QuoteSummary =>
  ({
    id: 1,
    referenceNo: 'SQ-2026-0001',
    destinationCountry: 'US',
    totalQuoteAmount: 1_500_000,
    totalQuoteAmountUsd: 1150.5,
    profitMargin: MARGIN,
    billableWeight: 15.5,
    status: 'draft',
    validityDate: null,
    createdAt: '2026-09-03T00:00:00.000Z',
    ...overrides,
  }) as QuoteSummary;

const tableProps = {
  quotes: [makeQuote()],
  isLoading: false,
  hasActiveFilters: false,
  onView: vi.fn(),
  onDelete: vi.fn(),
};

describe('Quote history margin visibility — desktop', () => {
  it('shows the margin column to an admin', () => {
    render(<DesktopQuoteTable {...tableProps} hideMargin={false} />);

    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText(`${MARGIN}%`)).toBeInTheDocument();
  });

  it('hides the column header from a member, not just the cells', () => {
    // A header left behind would leave an empty column — its own bug.
    render(<DesktopQuoteTable {...tableProps} hideMargin />);

    expect(screen.queryByText('Margin')).not.toBeInTheDocument();
    expect(screen.queryByText(`${MARGIN}%`)).not.toBeInTheDocument();
  });

  it('defaults to hiding when nobody passes the flag', () => {
    // Deny by default, matching the serializer.
    render(<DesktopQuoteTable {...tableProps} />);

    expect(screen.queryByText('Margin')).not.toBeInTheDocument();
  });

  it('renders the rest of the row for a member', () => {
    render(<DesktopQuoteTable {...tableProps} hideMargin />);

    expect(screen.getByText('SQ-2026-0001')).toBeInTheDocument();
  });

  it('survives a row the API sent without a margin', () => {
    // What a member's list actually looks like: the key is absent, not 0.
    render(
      <DesktopQuoteTable
        {...tableProps}
        quotes={[makeQuote({ profitMargin: undefined })]}
        hideMargin={false}
      />,
    );

    expect(screen.getByText('SQ-2026-0001')).toBeInTheDocument();
  });
});

describe('Quote history margin visibility — mobile', () => {
  it('shows the margin to an admin', () => {
    render(<MobileQuoteTable {...tableProps} hideMargin={false} />);

    expect(screen.getByText(`${MARGIN}%`)).toBeInTheDocument();
  });

  it('hides it from a member', () => {
    render(<MobileQuoteTable {...tableProps} hideMargin />);

    expect(screen.queryByText(`${MARGIN}%`)).not.toBeInTheDocument();
  });

  it('defaults to hiding', () => {
    render(<MobileQuoteTable {...tableProps} />);

    expect(screen.queryByText(`${MARGIN}%`)).not.toBeInTheDocument();
  });
});
