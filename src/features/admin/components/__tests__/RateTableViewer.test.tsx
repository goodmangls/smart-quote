import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RateTableViewer } from '../RateTableViewer';

const switchToRange = async (user: ReturnType<typeof userEvent.setup>) => {
  const modeSelect = screen.getByDisplayValue(/Exact/);
  await user.selectOptions(modeSelect, 'range');
};

/**
 * Zone ordering is numeric-aware — Z10 sorts after Z9, not between Z1 and Z2.
 *
 * The rule was written out three times (a shared helper plus two inline copies
 * in the carrier and product handlers), so these pin the ordering at every
 * entry point: a future edit that touches only one copy turns one of these red.
 */
describe('RateTableViewer — zone tab ordering', () => {
  const zoneTabs = (): string[] =>
    screen
      .getAllByRole('button')
      .map((b) => b.textContent?.trim() ?? '')
      .filter((label) => /^Z\d+$/.test(label));

  it('sorts zones numerically on first render', () => {
    render(<RateTableViewer />);

    expect(zoneTabs()).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10']);
  });

  // Round-trips back to UPS deliberately: it is the only carrier with a Z10, so
  // it is the only one where a naive lexicographic sort would show. DHL stops at
  // Z8 and FedEx uses letters, so neither would catch the regression.
  it('keeps numeric order after switching carrier', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);

    await user.selectOptions(screen.getByDisplayValue('UPS'), 'DHL');
    expect(zoneTabs()).not.toContain('Z10');

    await user.selectOptions(screen.getByDisplayValue('DHL'), 'UPS');

    expect(zoneTabs()).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10']);
  });

  it('keeps numeric order after switching product', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);

    await user.selectOptions(screen.getByDisplayValue('Parcel'), 'document');
    const tabs = zoneTabs();

    expect(tabs.length).toBeGreaterThan(0);
    expect(tabs).toEqual([...tabs].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))));
  });
});

describe('RateTableViewer — range (per-kg) view', () => {
  it('labels the range option with the carrier parcel threshold (UPS 20kg)', () => {
    render(<RateTableViewer />);

    expect(screen.getByRole('option', { name: 'Over 20kg (per-kg)' })).toBeInTheDocument();
  });

  it('explains what the per-kg table is and how freight is computed', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);
    await switchToRange(user);

    expect(screen.getByText(/Per-kg tariff for shipments over 20kg/)).toBeInTheDocument();
    expect(screen.getByText(/rate .* chargeable weight/i)).toBeInTheDocument();
  });

  it('shows a worked example row with real numbers (UPS Z1)', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);
    await switchToRange(user);

    // UPS first range row Z1 = 7,068 ₩/kg; sample weight 25kg → 176,700.
    expect(screen.getByText(/Z1 · 25kg/)).toBeInTheDocument();
    expect(screen.getByText(/7,068 × 25 = ₩176,700/)).toBeInTheDocument();
  });

  it('renders the open-ended last range without the 99999 sentinel', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);
    await switchToRange(user);

    expect(screen.getByText('299.1kg+')).toBeInTheDocument();
    expect(screen.queryByText(/99999/)).not.toBeInTheDocument();
  });

  it('uses the DHL threshold (30kg) after switching carrier', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);
    const carrierSelect = screen.getByDisplayValue('UPS');
    await user.selectOptions(carrierSelect, 'DHL');
    await switchToRange(user);

    expect(screen.getByText(/Per-kg tariff for shipments over 30kg/)).toBeInTheDocument();
    expect(screen.getByText('30.1kg+')).toBeInTheDocument();
  });

  it('links from the parcel exact table into the range view', async () => {
    const user = userEvent.setup();
    render(<RateTableViewer />);

    await user.click(screen.getByRole('button', { name: /Over 20kg — per-kg range rates/ }));

    expect(screen.getByText(/Per-kg tariff for shipments over 20kg/)).toBeInTheDocument();
  });
});
