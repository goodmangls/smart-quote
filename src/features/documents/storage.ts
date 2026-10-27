import type { z } from 'zod';
import { defaultQuotation, defaultTradeShipment } from './defaults';
import { quotationSchema, tradeShipmentSchema } from './types';
import type { DocumentType, Quotation, TradeShipment } from './types';

/**
 * Drafts persist in this browser only. The commercial invoice and the packing
 * list share one key: customs compares the two documents, so they must be
 * edited from one record rather than kept in step by hand.
 */

export const STORAGE_KEYS = {
  quotation: 'smartQuote.documents.quotation',
  trade: 'smartQuote.documents.trade',
} as const;

/** JSON exports carry a kind so a packing-list file can't load into a quotation. */
const EXPORT_KINDS = { quotation: 'quotation', trade: 'trade-shipment' } as const;
const EXPORT_VERSION = 1;
const MAX_IMPORT_BYTES = 2_000_000;

export type DraftKind = keyof typeof STORAGE_KEYS;

export const draftKindFor = (type: DocumentType): DraftKind =>
  type === 'quotation' ? 'quotation' : 'trade';

const readJson = (key: string): unknown => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

const loadWith = <T>(key: string, schema: z.ZodType<T>, fallback: () => T): T => {
  const parsed = schema.safeParse(readJson(key));
  return parsed.success ? parsed.data : fallback();
};

export const loadQuotation = (): Quotation =>
  loadWith(STORAGE_KEYS.quotation, quotationSchema, defaultQuotation);

export const loadTradeShipment = (): TradeShipment =>
  loadWith(STORAGE_KEYS.trade, tradeShipmentSchema, defaultTradeShipment);

/** Returns false when the browser refuses the write (quota, private mode). */
export const saveDraft = (kind: DraftKind, value: Quotation | TradeShipment): boolean => {
  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const clearDraft = (kind: DraftKind): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEYS[kind]);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

// ── JSON export / import ─────────────────────────────────────────────────────

export const exportDraft = (kind: DraftKind, value: Quotation | TradeShipment): string =>
  JSON.stringify({ kind: EXPORT_KINDS[kind], version: EXPORT_VERSION, data: value }, null, 2);

export type ImportResult<T> = { ok: true; data: T } | { ok: false; error: string };

const parseEnvelope = (text: string, kind: DraftKind): ImportResult<unknown> => {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'The file is too large to be a document draft.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null || !('kind' in parsed) || !('data' in parsed)) {
    return { ok: false, error: 'The file is not a Smart Quote document export.' };
  }
  if (parsed.kind !== EXPORT_KINDS[kind]) {
    return { ok: false, error: 'This file belongs to a different document type.' };
  }
  return { ok: true, data: parsed.data };
};

const importWith = <T>(text: string, kind: DraftKind, schema: z.ZodType<T>): ImportResult<T> => {
  const envelope = parseEnvelope(text, kind);
  if (!envelope.ok) return envelope;
  const result = schema.safeParse(envelope.data);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join('.') || 'file';
    return { ok: false, error: `The file has an invalid value at "${where}".` };
  }
  return { ok: true, data: result.data };
};

export const importQuotation = (text: string): ImportResult<Quotation> =>
  importWith(text, 'quotation', quotationSchema);

export const importTradeShipment = (text: string): ImportResult<TradeShipment> =>
  importWith(text, 'trade', tradeShipmentSchema);
