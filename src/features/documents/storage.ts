import type { z } from 'zod';

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

/** A missing, corrupt or invalid stored draft falls back to the blank document. */
export const loadDraft = <T>(spec: DraftSpec<T>): T => {
  const parsed = spec.schema.safeParse(readJson(spec.storageKey));
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
  const result = spec.schema.safeParse(parsed.data);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join('.') || 'file';
    return { ok: false, error: `The file has an invalid value at "${where}".` };
  }
  return { ok: true, data: result.data };
};
