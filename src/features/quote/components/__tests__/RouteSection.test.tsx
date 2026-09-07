import { render } from '@testing-library/react';
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

/**
 * The destination dropdown, scoped positionally because the section's labels are
 * not wired to their selects (no htmlFor/id), so getByLabelText cannot reach it.
 * The option count guards that assumption: destination carries every country,
 * dwarfing the zone (~11) and carrier (3) selects, so a markup reorder fails
 * loudly here instead of silently asserting against the wrong dropdown.
 */
const destinationSelect = (container: HTMLElement): HTMLSelectElement => {
  const select = container.querySelector('select');
  if (!select || select.options.length < 100) {
    throw new Error(
      `expected the destination select first, found ${select?.options.length ?? 'no select'}`,
    );
  }
  return select;
};

const renderSection = (overrides: Partial<QuoteInput> = {}) => {
  const utils = render(
    <RouteSection input={makeInput(overrides)} onFieldChange={vi.fn()} isMobileView={false} />,
  );
  return { ...utils, destination: destinationSelect(utils.container) };
};

/**
 * Read an option's label straight off the DOM.
 *
 * Deliberately NOT `getAllByRole('option')`: that computes an ARIA role and an
 * accessibility-visibility check for every element in the document, which over
 * this ~206-option dropdown cost 400ms–2.6s per call and varied six-fold run to
 * run. The three-carrier test below calls it once per carrier, so the worst case
 * blew the 5s default timeout whenever the machine was loaded — the suite failed
 * intermittently in full runs while passing alone. The DOM query returns the
 * identical elements in ~0.5ms.
 */
const optionTextFor = (destination: HTMLSelectElement, code: string): string =>
  destination.querySelector(`option[value="${code}"]`)?.textContent ?? '';

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
    const { destination } = renderSection({ overseasCarrier: 'UPS' });
    const text = optionTextFor(destination, unserviceable[0]);

    expect(text).toContain('calc.option.noZoneAnyCarrier');
    expect(text).not.toContain('calc.option.noZone —');
  });

  it('keeps the per-carrier label where switching carriers would actually help', () => {
    const { destination } = renderSection({ overseasCarrier: 'UPS' });
    const text = optionTextFor(destination, dhlOnly!);

    expect(text).toContain('calc.option.noZone');
    expect(text).not.toContain('calc.option.noZoneAnyCarrier');
  });

  it('keeps the unserviceable label whichever carrier is selected', () => {
    for (const carrier of ['UPS', 'DHL', 'FEDEX'] as const) {
      const { destination, unmount } = renderSection({ overseasCarrier: carrier });
      expect(optionTextFor(destination, unserviceable[0])).toContain(
        'calc.option.noZoneAnyCarrier',
      );
      unmount();
    }
  });

  it('leaves a fully served destination unlabeled', () => {
    const { destination } = renderSection({ overseasCarrier: 'UPS' });

    expect(optionTextFor(destination, 'US')).not.toContain('calc.option.noZone');
  });
});
