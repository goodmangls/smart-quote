import { COUNTRY_OPTIONS, UNSERVICEABLE_COUNTRY_CODES } from '../options';
import { UPS_ZONE_MAP } from '../ups_zones';
import { DHL_ZONE_MAP } from '../dhl_zones';
import { FEDEX_ZONE_MAP } from '../fedex_zones';

/**
 * A destination with no zone on the selected carrier is labeled "no {carrier}
 * zone", which invites the user to try another carrier. For a country that has
 * no zone on ANY carrier that advice is a dead end, so those need their own
 * label — and the list must stay derived from the zone maps, never hardcoded,
 * or it drifts the moment a zone table is updated.
 */
describe('UNSERVICEABLE_COUNTRY_CODES', () => {
  const hasAnyZone = (code: string) =>
    Boolean(UPS_ZONE_MAP[code] || DHL_ZONE_MAP[code] || FEDEX_ZONE_MAP[code]);

  it('contains no country that any carrier can actually reach', () => {
    const reachable = [...UNSERVICEABLE_COUNTRY_CODES].filter(hasAnyZone);
    expect(reachable).toEqual([]);
  });

  it('contains every selectable destination that no carrier can reach', () => {
    const missed = COUNTRY_OPTIONS.map((c) => c.code)
      .filter((code) => code !== 'KR')
      .filter((code) => !hasAnyZone(code))
      .filter((code) => !UNSERVICEABLE_COUNTRY_CODES.has(code));

    expect(missed).toEqual([]);
  });

  it('only lists countries the user can actually select', () => {
    const selectable = new Set(COUNTRY_OPTIONS.map((c) => c.code));
    const orphans = [...UNSERVICEABLE_COUNTRY_CODES].filter((c) => !selectable.has(c));

    expect(orphans).toEqual([]);
  });

  it('does not flag a destination every carrier serves', () => {
    expect(UNSERVICEABLE_COUNTRY_CODES.has('US')).toBe(false);
    expect(UNSERVICEABLE_COUNTRY_CODES.has('JP')).toBe(false);
  });

  it('is derived, so a country present on exactly one carrier is not flagged', () => {
    // CW has a DHL zone but no UPS or FedEx zone — switching carriers is real
    // advice there, so it must keep the per-carrier label.
    const singleCarrierOnly = COUNTRY_OPTIONS.map((c) => c.code).filter((code) => {
      const count = [UPS_ZONE_MAP[code], DHL_ZONE_MAP[code], FEDEX_ZONE_MAP[code]].filter(
        Boolean
      ).length;
      return count === 1;
    });

    expect(singleCarrierOnly.length).toBeGreaterThan(0);
    for (const code of singleCarrierOnly) {
      expect(UNSERVICEABLE_COUNTRY_CODES.has(code)).toBe(false);
    }
  });
});
