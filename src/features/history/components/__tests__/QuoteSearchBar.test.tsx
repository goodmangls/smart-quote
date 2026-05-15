import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteSearchBar } from '../QuoteSearchBar';

const defaultProps = {
  searchInput: '',
  onSearchInputChange: vi.fn(),
  onSearch: vi.fn(),
  activeStatus: undefined as undefined,
  onStatusFilter: vi.fn(),
  showFilters: false,
  onToggleFilters: vi.fn(),
  hasActiveFilters: false,
  onClearFilters: vi.fn(),
  minAmount: undefined as number | undefined,
  maxAmount: undefined as number | undefined,
  amountCurrency: 'KRW' as const,
  onAmountChange: vi.fn(),
  onCurrencyChange: vi.fn(),
};

describe('QuoteSearchBar', () => {
  it('renders search input with placeholder', () => {
    render(<QuoteSearchBar {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('Search by reference no or destination...'),
    ).toBeInTheDocument();
  });

  it('calls onSearchInputChange when typing', () => {
    const onSearchInputChange = vi.fn();
    render(<QuoteSearchBar {...defaultProps} onSearchInputChange={onSearchInputChange} />);

    const input = screen.getByPlaceholderText('Search by reference no or destination...');
    fireEvent.change(input, { target: { value: 'a' } });

    expect(onSearchInputChange).toHaveBeenCalledWith('a');
  });

  it('calls onSearch on form submit', async () => {
    const onSearch = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<QuoteSearchBar {...defaultProps} onSearch={onSearch} />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    await userEvent.click(searchButton);

    expect(onSearch).toHaveBeenCalled();
  });

  it('shows status filter buttons when showFilters is true', () => {
    render(<QuoteSearchBar {...defaultProps} showFilters={true} />);

    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('accepted')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('calls onStatusFilter when status button clicked', async () => {
    const onStatusFilter = vi.fn();
    render(<QuoteSearchBar {...defaultProps} showFilters={true} onStatusFilter={onStatusFilter} />);

    await userEvent.click(screen.getByText('draft'));

    expect(onStatusFilter).toHaveBeenCalledWith('draft');
  });

  it('shows Clear all button when hasActiveFilters is true', () => {
    render(<QuoteSearchBar {...defaultProps} showFilters={true} hasActiveFilters={true} />);

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('calls onClearFilters when Clear all clicked', async () => {
    const onClearFilters = vi.fn();
    render(
      <QuoteSearchBar
        {...defaultProps}
        showFilters={true}
        hasActiveFilters={true}
        onClearFilters={onClearFilters}
      />,
    );

    await userEvent.click(screen.getByText('Clear all'));

    expect(onClearFilters).toHaveBeenCalled();
  });

  describe('amount range', () => {
    it('renders KRW/USD toggle and min/max inputs when filters open', () => {
      render(<QuoteSearchBar {...defaultProps} showFilters={true} />);
      expect(screen.getByRole('button', { name: 'KRW' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'USD' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Min amount')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Max amount')).toBeInTheDocument();
    });

    it('calls onCurrencyChange when toggling to USD', async () => {
      const onCurrencyChange = vi.fn();
      render(
        <QuoteSearchBar {...defaultProps} showFilters={true} onCurrencyChange={onCurrencyChange} />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'USD' }));
      expect(onCurrencyChange).toHaveBeenCalledWith('USD');
    });

    it('calls onAmountChange with parsed numbers when typing min', () => {
      const onAmountChange = vi.fn();
      render(
        <QuoteSearchBar {...defaultProps} showFilters={true} onAmountChange={onAmountChange} />,
      );
      fireEvent.change(screen.getByPlaceholderText('Min amount'), {
        target: { value: '500000' },
      });
      expect(onAmountChange).toHaveBeenCalledWith({ min: 500000, max: undefined });
    });

    it('shows inline error when min > max', () => {
      render(
        <QuoteSearchBar
          {...defaultProps}
          showFilters={true}
          minAmount={1_000_000}
          maxAmount={100_000}
        />,
      );
      expect(screen.getByText('min must be ≤ max')).toBeInTheDocument();
    });
  });
});
