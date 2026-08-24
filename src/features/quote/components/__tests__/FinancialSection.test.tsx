import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinancialSection } from '../FinancialSection';
import { Incoterm, PackingType } from '@/types';
import type { QuoteInput } from '@/types';
import {
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
  DEFAULT_FSC_PERCENT_FEDEX,
} from '@/config/rates';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));

const makeInput = (overrides: Partial<QuoteInput> = {}): QuoteInput =>
  ({
    originCountry: 'KR',
    destinationCountry: 'US',
    destinationZip: '10001',
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [{ id: '1', length: 30, width: 30, height: 30, weight: 10, quantity: 1 }],
    marginPercent: 15,
    dutyTaxEstimate: 0,
    exchangeRate: 1400,
    fscPercent: 30,
    overseasCarrier: 'UPS',
    ...overrides,
  }) as QuoteInput;

const renderSection = (overrides: Partial<QuoteInput> = {}) => {
  const onFieldChange = vi.fn();
  render(
    <FinancialSection
      input={makeInput(overrides)}
      onFieldChange={onFieldChange}
      isMobileView={false}
    />,
  );
  return { onFieldChange, fscInput: screen.getByDisplayValue('30') as HTMLInputElement };
};

/**
 * The FSC field decides what "no value" means before the number ever reaches
 * the calculator, so this is where the FE/BE agreement is established.
 *
 * An explicit 0 is a real "no fuel surcharge" and is passed through untouched —
 * the backend has always read the field that way. An emptied field is not a 0;
 * it resolves to the carrier default, so clearing the box by accident cannot
 * silently strip ~45% of the fuel surcharge off the quote.
 */
describe('FinancialSection — FSC input', () => {
  it('passes an explicitly typed 0 through as 0', async () => {
    const user = userEvent.setup();
    const { onFieldChange, fscInput } = renderSection();

    await user.clear(fscInput);
    await user.type(fscInput, '0');

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', 0);
  });

  it('resolves an emptied field to the carrier default rather than 0', async () => {
    const user = userEvent.setup();
    const { onFieldChange, fscInput } = renderSection();

    await user.clear(fscInput);

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', DEFAULT_FSC_PERCENT);
  });

  it('uses the DHL default when DHL is the selected carrier', async () => {
    const user = userEvent.setup();
    const { onFieldChange, fscInput } = renderSection({ overseasCarrier: 'DHL' });

    await user.clear(fscInput);

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', DEFAULT_FSC_PERCENT_DHL);
  });

  it('uses the FedEx default when FedEx is the selected carrier', async () => {
    const user = userEvent.setup();
    const { onFieldChange, fscInput } = renderSection({ overseasCarrier: 'FEDEX' });

    await user.clear(fscInput);

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', DEFAULT_FSC_PERCENT_FEDEX);
  });

  it('leaves the box visibly empty after clearing so a new value can be typed', async () => {
    const user = userEvent.setup();
    const { fscInput } = renderSection();

    await user.clear(fscInput);

    expect(fscInput.value).toBe('');
  });

  // The DB rate (admin FSC widget) is the real default; the shipped constant is
  // only the stand-in until that request lands. An emptied field must fall back
  // to whichever one the calculator resolved, not to the constant.
  it('falls back to the supplied carrier default over the shipped constant', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    render(
      <FinancialSection
        input={makeInput()}
        onFieldChange={onFieldChange}
        isMobileView={false}
        carrierFscDefault={50.5}
      />
    );

    await user.clear(screen.getByDisplayValue('30') as HTMLInputElement);

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', 50.5);
  });

  it('still uses the constant when no carrier default is supplied', async () => {
    const user = userEvent.setup();
    const { onFieldChange, fscInput } = renderSection();

    await user.clear(fscInput);

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', DEFAULT_FSC_PERCENT);
  });

  it('passes an ordinary value straight through', async () => {
    const user = userEvent.setup();
    const { onFieldChange, fscInput } = renderSection();

    await user.clear(fscInput);
    await user.type(fscInput, '12.5');

    expect(onFieldChange).toHaveBeenLastCalledWith('fscPercent', 12.5);
  });
});
