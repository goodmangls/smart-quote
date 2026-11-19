import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputSection } from '../InputSection';
import { QuoteInput, Incoterm, PackingType } from '@/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/features/dashboard/hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null,
    isStale: false,
    retry: vi.fn(),
  }),
}));

const mockInput: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '',
  shippingMode: 'Door-to-Door',
  incoterm: Incoterm.DAP,
  packingType: PackingType.NONE,
  items: [{ id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }],
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: 1400,
  fscPercent: 30,
  overseasCarrier: 'UPS',
};

const defaultProps = {
  input: mockInput,
  onChange: vi.fn(),
};

describe('InputSection', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders route section with origin country (South Korea)', () => {
    render(<InputSection {...defaultProps} />);

    expect(screen.getByText('calc.section.route')).toBeInTheDocument();
    expect(screen.getByText(/South Korea/)).toBeInTheDocument();
  });

  it('renders destination country select', () => {
    render(<InputSection {...defaultProps} />);

    expect(screen.getByText('calc.label.destination')).toBeInTheDocument();
    // The select should have US selected
    const selects = screen.getAllByRole('combobox');
    const destSelect = selects.find((s) => (s as HTMLSelectElement).value === 'US');
    expect(destSelect).toBeDefined();
  });

  it('renders cargo section with item inputs', () => {
    render(<InputSection {...defaultProps} />);

    expect(screen.getByText('calc.section.cargo')).toBeInTheDocument();
    // t is mocked to return the key — itemLabel key has {n} replaced ({n} not in key itself)
    expect(screen.getByText('calc.cargo.itemLabel')).toBeInTheDocument();
    expect(screen.getByText('calc.cargo.addItem')).toBeInTheDocument();
  });

  it('renders service section (collapsed by default)', () => {
    render(<InputSection {...defaultProps} />);

    expect(screen.getByText('calc.section.service')).toBeInTheDocument();
    // Service section is collapsed by default — inner content not visible
    expect(screen.queryByText('Special Packing')).not.toBeInTheDocument();
  });

  it('renders financial section', () => {
    render(<InputSection {...defaultProps} />);

    expect(screen.getByText('calc.section.financial')).toBeInTheDocument();
    expect(screen.getByText('Ex. Rate (KRW/USD)')).toBeInTheDocument();
    expect(screen.getByText('FSC %')).toBeInTheDocument();
  });

  it('calls onChange when destination country changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InputSection {...defaultProps} onChange={onChange} />);

    // Reset zone filter to show all countries
    const selects = screen.getAllByRole('combobox');
    const zoneSelectEl = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some(
        (o) => o.value === '' && o.text.includes('calc.label.zoneAll'),
      ),
    ) as HTMLSelectElement;
    if (zoneSelectEl) {
      await user.selectOptions(zoneSelectEl, '');
    }

    // Find the destination country select (has value 'US')
    const destSelect = screen
      .getAllByRole('combobox')
      .find((s) => (s as HTMLSelectElement).value === 'US') as HTMLSelectElement;

    await user.selectOptions(destSelect, 'CA');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ destinationCountry: 'CA' }));
  });

  it('does not render Target Margin input when hideMargin=true', () => {
    render(<InputSection {...defaultProps} hideMargin={true} />);

    expect(screen.queryByText('Target Margin (%)')).not.toBeInTheDocument();
  });

  // Every field's visible label must also be its accessible name. Without the
  // htmlFor/id link a screen reader announces "spin button" with no name, and
  // a click on the label does not focus the field (WCAG 1.3.1, 4.1.2).
  describe('label association', () => {
    it('names each route, cargo and financial field by its visible label', () => {
      render(<InputSection {...defaultProps} />);

      for (const name of [
        'calc.label.destination',
        'calc.label.zone',
        'calc.label.zip',
        'calc.label.carrier',
        'Qty',
        /^Weight/,
        /^L \(/,
        /^W \(/,
        /^H \(/,
        'Ex. Rate (KRW/USD)',
        'FSC %',
        'Target Margin (%)',
      ]) {
        const field = screen.getByLabelText(name);
        expect(field.tagName).toMatch(/^(INPUT|SELECT|TEXTAREA)$/);
      }
    });

    it('gives each cargo row its own ids, so row 2 labels point at row 2', () => {
      const twoRows = {
        ...mockInput,
        items: [
          { id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 },
          { id: '2', width: 20, length: 20, height: 20, weight: 7, quantity: 3 },
        ],
      };
      render(<InputSection {...defaultProps} input={twoRows} />);

      const qty = screen.getAllByLabelText('Qty') as HTMLInputElement[];
      expect(qty.map((el) => el.value)).toEqual(['1', '3']);
      expect(new Set(qty.map((el) => el.id)).size).toBe(2);
    });

    it('keeps read-only displays (origin, mode) out of <label>', () => {
      const { container } = render(<InputSection {...defaultProps} />);

      const labelTexts = [...container.querySelectorAll('label')].map((l) => l.textContent);
      expect(labelTexts).not.toContain('calc.label.origin');
      expect(labelTexts).not.toContain('calc.label.mode');
      expect(screen.getByText('calc.label.origin')).toBeInTheDocument();
    });
  });
});

