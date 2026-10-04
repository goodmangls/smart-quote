import { describe, it, expect } from 'vitest';
import { translations, type Language } from '../translations';

// A key missing from one language never fails anywhere: t() quietly falls back
// to English, so the screen just shows English in the middle of Korean. That is
// how ko drifted 9 keys and ja/cn 21 keys behind before this test existed.
const OTHERS: Language[] = ['ko', 'ja', 'cn'];
const en = translations.en;
const enKeys = Object.keys(en).sort();
const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();

// Empty on purpose: Korean appends 님 and Japanese 様 after a name; English and
// Chinese add nothing.
const MAY_BE_EMPTY = new Set(['dashboard.honorific']);

describe('locale parity', () => {
  for (const lang of OTHERS) {
    const table = translations[lang];

    it(`${lang} has exactly the English keys`, () => {
      const keys = Object.keys(table);
      expect(enKeys.filter((k) => !(k in table)), `missing in ${lang}`).toEqual([]);
      expect(keys.filter((k) => !(k in en)), `only in ${lang}`).toEqual([]);
    });

    it(`${lang} keeps every {placeholder}`, () => {
      for (const key of enKeys) {
        expect(placeholders(table[key] ?? ''), `${lang} ${key}`).toEqual(placeholders(en[key]));
      }
    });
  }

  it('leaves no value empty unless it is meant to be', () => {
    for (const lang of ['en', ...OTHERS] as Language[]) {
      for (const [key, value] of Object.entries(translations[lang])) {
        if (MAY_BE_EMPTY.has(key)) continue;
        expect(value.trim(), `${lang} ${key}`).not.toBe('');
      }
    }
  });
});
