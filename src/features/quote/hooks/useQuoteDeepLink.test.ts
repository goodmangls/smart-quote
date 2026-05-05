/**
 * Vitest unit tests for useQuoteDeepLink — pure-function `parseQuoteDeepLink`
 * is exhaustively covered. Hook itself is exercised via JSDOM window.location.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Incoterm } from '@/types';
import { parseQuoteDeepLink, useQuoteDeepLink } from './useQuoteDeepLink';

describe('parseQuoteDeepLink — pure parser', () => {
  it('returns empty partial when query string is empty', () => {
    const r = parseQuoteDeepLink(new URLSearchParams(''));
    expect(r.hasPrefill).toBe(false);
    expect(r.partial).toEqual({});
  });

  describe('country normalization', () => {
    it('accepts ISO 2-letter codes (origin/dest)', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('origin=KR&dest=US'));
      expect(r.partial.originCountry).toBe('KR');
      expect(r.partial.destinationCountry).toBe('US');
    });

    it('lowercases input ➜ uppercases output', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('origin=kr&dest=us'));
      expect(r.partial.originCountry).toBe('KR');
      expect(r.partial.destinationCountry).toBe('US');
    });

    it('expands airport codes ICN → KR, LAX → US', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('origin=ICN&dest=LAX'));
      expect(r.partial.originCountry).toBe('KR');
      expect(r.partial.destinationCountry).toBe('US');
    });

    it('expands NRT → JP, FRA → DE, SIN → SG', () => {
      const tests = [
        ['NRT', 'JP'],
        ['FRA', 'DE'],
        ['SIN', 'SG'],
        ['HKG', 'HK'],
      ] as const;
      for (const [airport, country] of tests) {
        const r = parseQuoteDeepLink(new URLSearchParams(`dest=${airport}`));
        expect(r.partial.destinationCountry).toBe(country);
      }
    });

    it('drops malformed country codes silently', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('origin=XYZ&dest=K'));
      expect(r.partial.originCountry).toBeUndefined();
      expect(r.partial.destinationCountry).toBeUndefined();
      expect(r.hasPrefill).toBe(false);
    });

    it('accepts both `dest` and `destination` aliases', () => {
      const a = parseQuoteDeepLink(new URLSearchParams('dest=US'));
      const b = parseQuoteDeepLink(new URLSearchParams('destination=US'));
      expect(a.partial.destinationCountry).toBe('US');
      expect(b.partial.destinationCountry).toBe('US');
    });
  });

  describe('zip code', () => {
    it('accepts plain zip', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('zip=90001'));
      expect(r.partial.destinationZip).toBe('90001');
    });

    it('accepts `postcode` alias', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('postcode=SW1A1AA'));
      expect(r.partial.destinationZip).toBe('SW1A1AA');
    });

    it('rejects zip > 12 chars (likely garbage)', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('zip=' + 'A'.repeat(50)));
      expect(r.partial.destinationZip).toBeUndefined();
    });
  });

  describe('carrier', () => {
    it('accepts UPS / DHL', () => {
      expect(parseQuoteDeepLink(new URLSearchParams('carrier=UPS')).partial.overseasCarrier).toBe('UPS');
      expect(parseQuoteDeepLink(new URLSearchParams('carrier=DHL')).partial.overseasCarrier).toBe('DHL');
    });

    it('rejects unknown carriers (FedEx etc.)', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('carrier=FEDEX'));
      expect(r.partial.overseasCarrier).toBeUndefined();
    });
  });

  describe('incoterm', () => {
    it('maps DAP correctly', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('incoterm=DAP'));
      expect(r.partial.incoterm).toBe(Incoterm.DAP);
    });

    it('accepts C&F variant for CNF', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('incoterm=C%26F'));
      expect(r.partial.incoterm).toBe(Incoterm.CNF);
    });

    it('rejects unknown incoterm', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('incoterm=ZZZ'));
      expect(r.partial.incoterm).toBeUndefined();
    });
  });

  describe('cargo dimensions', () => {
    it('builds a single-item array when weight present', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('weight=10'));
      expect(r.partial.items).toHaveLength(1);
      expect(r.partial.items?.[0].weight).toBe(10);
    });

    it('parses L/W/H + qty', () => {
      const r = parseQuoteDeepLink(
        new URLSearchParams('weight=5&L=50&W=40&H=30&qty=2'),
      );
      expect(r.partial.items?.[0]).toMatchObject({
        weight: 5, length: 50, width: 40, height: 30, quantity: 2,
      });
    });

    it('accepts long-form aliases length/width/height/quantity', () => {
      const r = parseQuoteDeepLink(
        new URLSearchParams('length=100&width=80&height=50&quantity=3'),
      );
      expect(r.partial.items?.[0]).toMatchObject({
        length: 100, width: 80, height: 50, quantity: 3,
      });
    });

    it('clamps weight: rejects 0 and negative', () => {
      expect(parseQuoteDeepLink(new URLSearchParams('weight=0')).partial.items).toBeUndefined();
      expect(parseQuoteDeepLink(new URLSearchParams('weight=-5')).partial.items).toBeUndefined();
    });

    it('clamps weight: rejects >5000kg (sanity)', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('weight=99999'));
      expect(r.partial.items).toBeUndefined();
    });

    it('clamps dimensions: rejects 0 or 501+ cm', () => {
      const r1 = parseQuoteDeepLink(new URLSearchParams('L=0'));
      const r2 = parseQuoteDeepLink(new URLSearchParams('L=501'));
      expect(r1.partial.items).toBeUndefined();
      expect(r2.partial.items).toBeUndefined();
    });

    it('rejects non-numeric weight', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('weight=abc'));
      expect(r.partial.items).toBeUndefined();
    });

    it('uses fallback defaults when only some dims provided', () => {
      const r = parseQuoteDeepLink(new URLSearchParams('weight=10'));
      expect(r.partial.items?.[0]).toMatchObject({
        weight: 10, length: 10, width: 10, height: 10, quantity: 1,
      });
    });
  });

  describe('hasPrefill flag', () => {
    it('false for irrelevant query (UTM only)', () => {
      const r = parseQuoteDeepLink(
        new URLSearchParams('utm_source=insights&utm_medium=cta'),
      );
      expect(r.hasPrefill).toBe(false);
    });

    it('true when at least one prefill key present', () => {
      const r = parseQuoteDeepLink(
        new URLSearchParams('origin=KR&utm_source=insights'),
      );
      expect(r.hasPrefill).toBe(true);
    });
  });

  describe('full integration — Phase 2 deep-link example', () => {
    it('handles the canonical Insights CTA URL', () => {
      const url = 'origin=ICN&dest=LAX&zip=90001&weight=5&L=50&W=40&H=30&carrier=UPS&qty=1' +
                  '&utm_source=insights&utm_medium=inline-cta&utm_campaign=daily-brief-2026-05-01';
      const r = parseQuoteDeepLink(new URLSearchParams(url));
      expect(r.hasPrefill).toBe(true);
      expect(r.partial).toMatchObject({
        originCountry: 'KR',
        destinationCountry: 'US',
        destinationZip: '90001',
        overseasCarrier: 'UPS',
        items: [{
          id: '1', weight: 5, length: 50, width: 40, height: 30, quantity: 1,
        }],
      });
    });
  });
});

describe('useQuoteDeepLink — React hook (JSDOM)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // JSDOM allows reassigning location via defineProperty
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('returns empty partial when no query string', () => {
    const { result } = renderHook(() => useQuoteDeepLink());
    expect(result.current.hasPrefill).toBe(false);
    expect(result.current.partial).toEqual({});
  });

  it('parses query string from window.location.search', () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '?origin=KR&dest=US&weight=10' },
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useQuoteDeepLink());
    expect(result.current.hasPrefill).toBe(true);
    expect(result.current.partial.originCountry).toBe('KR');
    expect(result.current.partial.destinationCountry).toBe('US');
    expect(result.current.partial.items?.[0].weight).toBe(10);
  });

  it('memoizes — never re-parses on re-render', () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '?origin=KR' },
      writable: true,
      configurable: true,
    });
    const { result, rerender } = renderHook(() => useQuoteDeepLink());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first); // Same reference (memoized)
  });
});
