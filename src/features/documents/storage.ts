import type { z } from 'zod';
import { fitToSchema } from './fitToSchema';

/**
 * Drafts persist in this browser only, one localStorage key per record. Some
 * documents share a record — the commercial invoice, packing list and shipping
 * instruction all read `trade`, because customs compares those documents and
 * they must not drift apart.
 *
 * ⚠️ The `quotation` and `trade` keys and their export kinds date from v1.
 * Renaming either strands every saved draft and exported file.
 */

export interface DraftSpec<T> {
  storageKey: string;
  /** Written into exports so a file can't load into the wrong document. */
  exportKind: string;
  schema: z.ZodType<T>;
  defaults: () => T;
}

const KEY_PREFIX = 'smartQuote.documents.';
const EXPORT_VERSION = 1;
const MAX_IMPORT_BYTES = 2_000_000;

export const draftSpec = <T>(
  name: string,
  exportKind: string,
  schema: z.ZodType<T>,
  defaults: () => T,
): DraftSpec<T> => ({ storageKey: KEY_PREFIX + name, exportKind, schema, defaults });

const readJson = (key: string): unknown => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

/** Pulls a draft back under its schema's upper limits; see `fitToSchema`. */
export const fitDraft = <T>(spec: DraftSpec<T>, value: unknown): unknown =>
  fitToSchema(spec.schema, value);

/**
 * A missing, corrupt or wrong-shaped stored draft falls back to the blank
 * document. A value that only runs past a length or size limit is trimmed
 * instead, so the rest of the draft survives.
 */
export const loadDraft = <T>(spec: DraftSpec<T>): T => {
  const parsed = spec.schema.safeParse(fitDraft(spec, readJson(spec.storageKey)));
  return parsed.success ? parsed.data : spec.defaults();
};

/** Returns false when the browser refuses the write (quota, private mode). */
export const saveDraft = (storageKey: string, value: unknown): boolean => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const clearDraft = (storageKey: string): void => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

// ── JSON export / import ─────────────────────────────────────────────────────

export const exportDraft = <T>(spec: DraftSpec<T>, value: T): string =>
  JSON.stringify({ kind: spec.exportKind, version: EXPORT_VERSION, data: value }, null, 2);

export type ImportResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const importDraft = <T>(spec: DraftSpec<T>, text: string): ImportResult<T> => {
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
  if (parsed.kind !== spec.exportKind) {
    return { ok: false, error: 'This file belongs to a different document type.' };
  }
  // Trim over-limit text first: a file exported from an older release, before
  // the editor enforced the limits, must still import.
  const result = spec.schema.safeParse(fitDraft(spec, parsed.data));
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join('.') || 'file';
    return { ok: false, error: `The file has an invalid value at "${where}".` };
  }
  return { ok: true, data: result.data };
};
