import { describe, it, expect } from 'vitest';
import { translations, type Language } from '../translations';

// The quote-history screen and the status labels shared with the dashboard.
// A key missing from one language silently falls back to English, and a
// translation that drops a {placeholder} leaves the value out of the message
// (or prints the braces) — neither fails anywhere else.
const SCOPED = /^(history\.|quote\.status\.)/;
const OTHERS: Language[] = ['ko', 'ja', 'cn'];
const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();

const scopedKeys = Object.keys(translations.en).filter((k) => SCOPED.test(k));

describe('history translations', () => {
  it('covers the history screen', () => {
    expect(scopedKeys.length).toBeGreaterThan(50);
  });

  for (const lang of OTHERS) {
    it(`${lang} has every key, translated, with the same placeholders`, () => {
      const table = translations[lang];
      for (const key of scopedKeys) {
        const value = table[key];
        expect(value, `${lang} ${key}`).toBeTruthy();
        expect(placeholders(value), `${lang} ${key}`).toEqual(placeholders(translations.en[key]));
      }
    });
  }

  it('labels every quote status in every language', () => {
    const statuses = ['draft', 'sent', 'confirmed', 'accepted', 'rejected', 'expired'];
    for (const lang of ['en', ...OTHERS] as Language[]) {
      for (const s of statuses) {
        expect(translations[lang][`quote.status.${s}`], `${lang} ${s}`).toBeTruthy();
      }
    }
  });
});
