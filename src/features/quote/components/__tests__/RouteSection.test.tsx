import { render, screen } from '@testing-library/react';
import { RouteSection } from '../RouteSection';
import { Incoterm, PackingType } from '@/types';
import type { QuoteInput } from '@/types';
import { UNSERVICEABLE_COUNTRY_CODES } from '@/config/options';
import { UPS_ZONE_MAP } from '@/config/ups_zones';
import { DHL_ZONE_MAP } from '@/config/dhl_zones';

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

const renderSection = (overrides: Partial<QuoteInput> = {}) =>
  render(
    <RouteSection input={makeInput(overrides)} onFieldChange={vi.fn()} isMobileView={false} />
  );

const optionTextFor = (code: string): string => {
  const option = screen
    .getAllByRole('option')
    .find((o) => (o as HTMLOptionElement).value === code);
  return option?.textContent ?? '';
};

/**
 * The destination dropdown labels countries the selected carrier has no zone
 * for. That label reads as "try another carrier" — good advice when another
 * carrier does serve the country, a dead end when none of them do. The two
 * cases get different labels.
 */
describe('RouteSection — destination labels', () => {
  const unserviceable = [...UNSERVICEABLE_COUNTRY_CODES];
  // Served by DHL but not UPS, so "no UPS zone" is genuinely actionable.
  const dhlOnly = Object.keys(DHL_ZONE_MAP).find((c) => !UPS_ZONE_MAP[c]);

  it('has at least one country of each kind to distinguish', () => {
    expect(unserviceable.length).toBeGreaterThan(0);
    expect(dhlOnly).toBeDefined();
  });

  it('marks a country no carrier serves as unserviceable, not merely missing a zone', () => {
    renderSection({ overseasCarrier: 'UPS' });
    const text = optionTextFor(unserviceable[0]);

    expect(text).toContain('calc.option.noZoneAnyCarrier');
    expect(text).not.toContain('calc.option.noZone —');
  });

  it('keeps the per-carrier label where switching carriers would actually help', () => {
    renderSection({ overseasCarrier: 'UPS' });
    const text = optionTextFor(dhlOnly!);

    expect(text).toContain('calc.option.noZone');
    expect(text).not.toContain('calc.option.noZoneAnyCarrier');
  });

  it('keeps the unserviceable label whichever carrier is selected', () => {
    for (const carrier of ['UPS', 'DHL', 'FEDEX'] as const) {
      const { unmount } = renderSection({ overseasCarrier: carrier });
      expect(optionTextFor(unserviceable[0])).toContain('calc.option.noZoneAnyCarrier');
      unmount();
    }
  });

  it('leaves a fully served destination unlabeled', () => {
    renderSection({ overseasCarrier: 'UPS' });

    expect(optionTextFor('US')).not.toContain('calc.option.noZone');
  });
});
