import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RateTableViewer } from '../RateTableViewer';

const switchToRange = async (user: ReturnType<typeof userEvent.setup>) => {
  const modeSelect = screen.getByDisplayValue(/Exact/);
  await user.selectOptions(modeSelect, 'range');
};

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
