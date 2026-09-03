import { render, screen } from '@testing-library/react';
import { MarginText, LowMarginBadge } from '../QuoteHistoryTableParts';
import { LOW_MARGIN_THRESHOLD_PERCENT, isLowMargin } from '@/config/business-rules';

/**
 * A saved quote below the approval threshold used to be signalled only by the
 * margin text turning amber. Colour alone is easy to miss in a dense table and
 * carries nothing for anyone who can't separate the two hues, so these assert
 * the words — a colour-only regression fails here.
 */
describe('Low margin threshold', () => {
  it('matches the approval threshold the calculator warns at', () => {
    expect(LOW_MARGIN_THRESHOLD_PERCENT).toBe(10);
  });

  it('is exclusive — exactly the threshold is not low', () => {
    expect(isLowMargin(LOW_MARGIN_THRESHOLD_PERCENT)).toBe(false);
    expect(isLowMargin(LOW_MARGIN_THRESHOLD_PERCENT - 0.1)).toBe(true);
  });

  it('treats a 0% margin as low', () => {
    // The admin default is now 0, so this is the common case, not an edge one.
    expect(isLowMargin(0)).toBe(true);
  });
});

describe('MarginText', () => {
  it('says "Low Margin" in words, not just in colour', () => {
    render(<MarginText profitMargin={4.2} />);

    expect(screen.getByText('4.2%')).toBeInTheDocument();
    expect(screen.getByText('Low Margin')).toBeInTheDocument();
  });

  it('flags a 0% margin', () => {
    render(<MarginText profitMargin={0} />);

    expect(screen.getByText('Low Margin')).toBeInTheDocument();
  });

  it('leaves a healthy margin unflagged', () => {
    render(<MarginText profitMargin={19.4} />);

    expect(screen.getByText('19.4%')).toBeInTheDocument();
    expect(screen.queryByText('Low Margin')).not.toBeInTheDocument();
  });

  it('does not flag a quote sitting exactly on the threshold', () => {
    render(<MarginText profitMargin={LOW_MARGIN_THRESHOLD_PERCENT} />);

    expect(screen.queryByText('Low Margin')).not.toBeInTheDocument();
  });
});

describe('LowMarginBadge', () => {
  it('names the threshold so the reader knows why it fired', () => {
    render(<LowMarginBadge />);

    expect(screen.getByTitle(/below 10%/)).toBeInTheDocument();
    expect(screen.getByTitle(/approval required/)).toBeInTheDocument();
  });
});
