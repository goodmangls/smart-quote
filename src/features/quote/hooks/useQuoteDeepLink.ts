/**
 * useQuoteDeepLink — parses /quote URL query string and returns a partial
 * QuoteInput suitable for one-shot prefill of the form.
 *
 * Phase 2 hook: when /insights launches, daily-brief CTAs link to
 *   /quote?origin=KR&dest=US&zip=90001&weight=10&L=50&W=40&H=30&carrier=UPS
 *     &qty=1&utm_source=insights&utm_medium=inline-cta
 *
 * Design:
 *   - Only applies on initial mount (skip if already navigated within /quote)
 *   - Validates each param and silently drops malformed values (no throw)
 *   - Country aliases: ICN → KR (origin only), LAX/JFK/etc → US dest (best-effort)
 *   - UTM params are not consumed here; GA4/GTM picks them up automatically
 */
import { useMemo } from 'react';
import { Incoterm, type QuoteInput, type CargoItem } from '@/types';

type Carrier = 'UPS' | 'DHL';

interface DeepLinkResult {
  /** Partial input suitable for `setInput((prev) => ({ ...prev, ...partial }))` */
  partial: Partial<QuoteInput>;
  /** True iff at least one recognized prefill key was present in the URL */
  hasPrefill: boolean;
}

const AIRPORT_TO_COUNTRY: Readonly<Record<string, string>> = {
  // Origin codes (handful supported — most users expect KR)
  ICN: 'KR', GMP: 'KR', PUS: 'KR',
  // Destination codes — best-effort mapping for top routes
  LAX: 'US', JFK: 'US', ORD: 'US', IAH: 'US', ATL: 'US', SEA: 'US',
  NRT: 'JP', HND: 'JP', KIX: 'JP',
  PVG: 'CN', PEK: 'CN',
  HKG: 'HK', TPE: 'TW',
  FRA: 'DE', AMS: 'NL', CDG: 'FR', LHR: 'GB', MUC: 'DE',
  DXB: 'AE', DOH: 'QA', IST: 'TR',
  SIN: 'SG',
};

function normalizeCountry(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toUpperCase();
  if (v.length === 2 && /^[A-Z]{2}$/.test(v)) return v;
  if (v.length === 3 && AIRPORT_TO_COUNTRY[v]) return AIRPORT_TO_COUNTRY[v];
  return undefined;
}

function clampNumber(raw: string | null | undefined, min: number, max: number): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (n < min || n > max) return undefined;
  return n;
}

function normalizeCarrier(raw: string | null | undefined): Carrier | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toUpperCase();
  if (v === 'UPS' || v === 'DHL') return v;
  return undefined;
}

function normalizeIncoterm(raw: string | null | undefined): Incoterm | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toUpperCase();
  // Only DAP is supported for express in BridgeLogis policy (CLAUDE.md), but we
  // accept others for completeness and let the form's downstream logic flag.
  const map: Readonly<Record<string, Incoterm>> = {
    EXW: Incoterm.EXW, FOB: Incoterm.FOB, CNF: Incoterm.CNF,
    'C&F': Incoterm.CNF, CIF: Incoterm.CIF, DAP: Incoterm.DAP, DDP: Incoterm.DDP,
  };
  return map[v];
}

/**
 * Parse a URLSearchParams-like object into a QuoteInput partial.
 * Exposed for testing; production code uses the hook.
 */
export function parseQuoteDeepLink(params: URLSearchParams): DeepLinkResult {
  const partial: Partial<QuoteInput> = {};
  let touched = false;

  const origin = normalizeCountry(params.get('origin'));
  if (origin) { partial.originCountry = origin; touched = true; }

  const dest = normalizeCountry(params.get('dest') ?? params.get('destination'));
  if (dest) { partial.destinationCountry = dest; touched = true; }

  const zip = (params.get('zip') ?? params.get('postcode'))?.trim();
  if (zip && zip.length <= 12) { partial.destinationZip = zip; touched = true; }

  const carrier = normalizeCarrier(params.get('carrier'));
  if (carrier) { partial.overseasCarrier = carrier; touched = true; }

  const incoterm = normalizeIncoterm(params.get('incoterm'));
  if (incoterm) { partial.incoterm = incoterm; touched = true; }

  // Cargo dimensions — single item override
  const weight = clampNumber(params.get('weight') ?? params.get('wt'), 0.1, 5000);
  const length = clampNumber(params.get('L') ?? params.get('length'), 1, 500);
  const width  = clampNumber(params.get('W') ?? params.get('width'),  1, 500);
  const height = clampNumber(params.get('H') ?? params.get('height'), 1, 500);
  const qty    = clampNumber(params.get('qty') ?? params.get('quantity'), 1, 1000);

  if (weight !== undefined || length !== undefined || width !== undefined ||
      height !== undefined || qty !== undefined) {
    const item: CargoItem = {
      id: '1',
      weight: weight ?? 1,
      length: length ?? 10,
      width: width ?? 10,
      height: height ?? 10,
      quantity: qty ?? 1,
    };
    partial.items = [item];
    touched = true;
  }

  return { partial, hasPrefill: touched };
}

/**
 * React hook — call once at component mount. Returns memoized DeepLinkResult.
 * Reads from `window.location.search` to avoid coupling to react-router-dom;
 * the host already uses RR7 but this stays lib-agnostic for testability.
 */
export function useQuoteDeepLink(): DeepLinkResult {
  return useMemo(() => {
    if (typeof window === 'undefined') return { partial: {}, hasPrefill: false };
    return parseQuoteDeepLink(new URLSearchParams(window.location.search));
  }, []);
}
