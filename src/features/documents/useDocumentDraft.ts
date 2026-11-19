import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraft } from './storage';

export interface DocumentDraft<T> {
  value: T;
  update: (patch: Partial<T>) => void;
  replace: (next: T) => void;
  /** False once the browser refuses a save, so the page can warn instead of losing work silently. */
  saved: boolean;
}

const SAVE_DELAY_MS = 400;

/**
 * Holds one document draft and writes it to localStorage shortly after each
 * edit. A failed write is surfaced through `saved` rather than swallowed.
 *
 * `fit` runs on every change. `DraftEditor` passes the schema's limits here, so
 * the form can never hold a value that would fail to load next time. Text
 * stops at its limit and an over-range number snaps to the maximum.
 */
export const useDocumentDraft = <T extends object>(
  storageKey: string,
  load: () => T,
  fit: (value: T) => T = (value) => value,
): DocumentDraft<T> => {
  const [value, setValue] = useState<T>(load);
  const [saved, setSaved] = useState(true);
  const first = useRef(true);
  const dirty = useRef(false);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
    if (first.current) {
      first.current = false;
      return;
    }
    dirty.current = true;
    const timer = window.setTimeout(() => {
      dirty.current = false;
      setSaved(saveDraft(storageKey, value));
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [storageKey, value]);

  // Several documents share one draft: flush a pending edit on unmount so
  // switching between them right after typing does not drop it.
  useEffect(
    () => () => {
      if (dirty.current) saveDraft(storageKey, latest.current);
    },
    [storageKey],
  );

  // `fit` is a fresh closure on every render; a ref keeps the callbacks stable.
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const update = useCallback(
    (patch: Partial<T>) => setValue((prev) => fitRef.current({ ...prev, ...patch })),
    [],
  );
  const replace = useCallback((next: T) => setValue(fitRef.current(next)), []);

  return { value, update, replace, saved };
};

/** Immutable list helpers for the item editors. */
export const replaceAt = <T>(list: readonly T[], index: number, patch: Partial<T>): T[] =>
  list.map((item, i) => (i === index ? { ...item, ...patch } : item));

export const removeAt = <T>(list: readonly T[], index: number): T[] =>
  list.filter((_, i) => i !== index);
