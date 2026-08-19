import { FEDEX_ZONE_MAP, determineFedexZone } from '../fedex_zones';

/**
 * Regression guard for the FedEx country→zone table.
 *
 * The zone letter selects the rate table, so a wrong letter silently changes the
 * quoted price. These fixtures are transcribed from the official source
 * ("FDX 국가별 ZONE.pdf", 수출 columns) and must be updated together with
 * fedex_zones.ts whenever FedEx publishes a new table.
 */
describe('FEDEX_ZONE_MAP', () => {
  // Countries whose zone was wrong before the 2026-08 sync against the official
  // table. Each one is asserted by value so a regression cannot slip back in.
  const CORRECTED: ReadonlyArray<readonly [string, string]> = [
    ['BE', 'M'], // was G
    ['NL', 'M'], // was G
    ['CH', 'G'], // was M
    ['IE', 'G'], // was M
    ['LU', 'G'], // was M
    ['PT', 'G'], // was M
    ['MC', 'G'], // was M
    ['LI', 'G'], // was M
    ['IL', 'H'], // was G — +17% at 20kg
    ['AD', 'H'], // was M — +17% at 20kg
    ['MP', 'I'], // was D — +74% at 20kg
    ['NZ', 'U'], // was F
  ];

  it.each(CORRECTED)('maps %s to zone %s (corrected against the official table)', (iso, zone) => {
    expect(FEDEX_ZONE_MAP[iso]?.rateKey).toBe(zone);
  });

  // One representative per zone, so a bulk regeneration that shifts a whole group
  // is caught rather than only single-country edits.
  const PER_ZONE: ReadonlyArray<readonly [string, string]> = [
    ['MO', 'A'],
    ['GU', 'D'],
    ['US', 'F'],
    ['AT', 'G'],
    ['TR', 'H'],
    ['BR', 'I'],
    ['EG', 'J'],
    ['CN-S', 'K'],
    ['GB', 'M'],
    ['VN', 'N'],
    ['IN', 'O'],
    ['JP', 'P'],
    ['MY', 'Q'],
    ['TH', 'R'],
    ['PH', 'S'],
    ['ID', 'T'],
    ['AU', 'U'],
    ['HK', 'V'],
    ['CN', 'W'],
    ['TW', 'X'],
    ['SG', 'Y'],
  ];

  it.each(PER_ZONE)('maps %s to zone %s', (iso, zone) => {
    expect(FEDEX_ZONE_MAP[iso]?.rateKey).toBe(zone);
  });

  it('covers every country listed in the official table', () => {
    expect(Object.keys(FEDEX_ZONE_MAP)).toHaveLength(205);
  });

  it('uses only zone letters that exist in the FedEx tariff', () => {
    const VALID = new Set('ADEFGHIJKMNOPQRSTUVWXY'.split(''));
    const bad = Object.entries(FEDEX_ZONE_MAP).filter(([, v]) => !VALID.has(v.rateKey));
    expect(bad).toEqual([]);
  });

  it('keeps rateKey and label consistent — label starts with the zone letter', () => {
    const mismatched = Object.entries(FEDEX_ZONE_MAP).filter(
      ([, v]) => !v.label.startsWith(`${v.rateKey}/`),
    );
    expect(mismatched).toEqual([]);
  });
});

describe('determineFedexZone for unmapped countries', () => {
  // There is deliberately no fallback zone. Earlier fallbacks (Y/Singapore,
  // then J) both priced unmapped destinations without telling the user; now an
  // unmapped country returns null and the UI shows "zone unavailable".
  it('returns null instead of a guessed zone', () => {
    expect(determineFedexZone('ZZ')).toBeNull();
  });

  it('returns the mapped zone for countries that are listed', () => {
    expect(determineFedexZone('SG')).toEqual({ rateKey: 'Y', label: 'Y/Singapore' });
  });

  // Countries FedEx does not list at all. They must stay unmapped — adding a
  // guessed zone here would be worse than no data.
  it.each(['MM', 'SD', 'SS', 'SL', 'CF', 'KM', 'GW', 'TM', 'TJ', 'XK', 'SM', 'VA'])(
    '%s is absent from the official table and resolves to null',
    (iso) => {
      expect(FEDEX_ZONE_MAP[iso]).toBeUndefined();
      expect(determineFedexZone(iso)).toBeNull();
    },
  );
});
