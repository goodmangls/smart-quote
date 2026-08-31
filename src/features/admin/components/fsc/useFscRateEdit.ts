import { useState } from 'react';
import * as Sentry from '@sentry/browser';
import { updateFscRate } from '@/api/fscApi';
import type { FscCarrier, FscRates } from '@/api/fscApi';

/** Percentage carriers the widget writes to `fsc_rates`, in save order. */
export const EDITABLE_FSC_CARRIERS: readonly FscCarrier[] = ['UPS', 'DHL', 'FEDEX'];

export type FscEditRates = Record<FscCarrier, string>;

const EMPTY_EDIT_RATES: FscEditRates = { UPS: '', DHL: '', FEDEX: '' };

/**
 * Each carrier is its own POST, so a mid-run failure leaves `fsc_rates`
 * PARTIALLY updated and quotes silently split between two weeks' rates.
 *
 * The three groups are NOT interchangeable, and collapsing them lies to the
 * admin. A thrown request only means the CLIENT never saw a response — a
 * timeout, a dropped connection or a 502 can all arrive after the server has
 * already committed the row. So the carrier that failed is *indeterminate*,
 * not "unchanged"; only the carriers never attempted are certainly unchanged.
 * The caller re-reads the table on failure and the widget then shows each row's
 * real value under its input ("현재 DB"), so the honest move is to point the
 * admin at that rather than assert a DB state we cannot know. Keep this wording
 * and that label in step — editing stays open on failure, so the cells otherwise
 * show only what the admin typed and the advice would point at nothing.
 */
function describeSaveFailure(written: readonly FscCarrier[], failed: FscCarrier | null): string {
  const untouched = EDITABLE_FSC_CARRIERS.filter(
    (carrier) => !written.includes(carrier) && carrier !== failed,
  );

  const parts = ['요율을 모두 저장하지 못했습니다.'];

  if (written.length > 0) {
    parts.push(`${written.join('·')} 는 저장됐습니다.`);
  }
  if (failed) {
    parts.push(
      `${failed} 는 응답을 받지 못해 반영 여부가 확실하지 않습니다 — 입력칸 아래 '현재 DB' 값으로 확인해 주세요.`,
    );
  }
  if (untouched.length > 0) {
    parts.push(`${untouched.join('·')} 는 시도되지 않아 이전 요율입니다.`);
  }

  return parts.join(' ');
}

export function useFscRateEdit(data: FscRates | null, fetchRates: () => Promise<void> | void) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editRates, setEditRates] = useState<FscEditRates>(EMPTY_EDIT_RATES);

  const handleEditStart = () => {
    setEditRates(
      Object.fromEntries(
        EDITABLE_FSC_CARRIERS.map((carrier) => [
          carrier,
          String(data?.rates[carrier]?.international ?? ''),
        ]),
      ) as FscEditRates,
    );
    setSaveError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const written: FscCarrier[] = [];
    // The carrier whose request is in flight. Held pessimistically so that if the
    // await throws we know exactly which one has an unknown outcome, rather than
    // lumping it in with the carriers we never sent.
    let inFlight: FscCarrier | null = null;

    try {
      // Sequential on purpose: each call writes an audit log row, and a stable
      // order keeps that trail readable — and makes `written` an exact prefix,
      // so a failure can name precisely which carriers landed.
      for (const carrier of EDITABLE_FSC_CARRIERS) {
        const rate = parseFloat(editRates[carrier]);
        if (!isNaN(rate)) {
          inFlight = carrier;
          await updateFscRate(carrier, rate, rate);
          written.push(carrier);
          inFlight = null;
        }
      }
      await fetchRates();
      setIsEditing(false);
    } catch (err) {
      // NOT swallowed: useFscRates' error state only covers the GET, so a failed
      // POST reported nothing at all — the admin saw the form sitting there and
      // had no way to know the table was half-written.
      Sentry.captureException(err);
      setSaveError(describeSaveFailure(written, inFlight));
      // Re-read regardless, so the widget can show what is actually in the table
      // rather than what the admin thought they saved. Editing stays open so the
      // partial write stays visible and re-submittable.
      //
      // No try/catch here: `fetchRates` is useFscRates' `retry`, which swallows
      // its own failure into that hook's `error` state and never rejects. The
      // widget reads that state — a failed re-read must NOT be rendered as a
      // confirmed "현재 DB" value, because in this repo `data` is seeded from
      // rates.ts and would then present the CONSTANTS as the table's contents.
      await fetchRates();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSaveError(null);
    setIsEditing(false);
  };

  return {
    isEditing,
    saving,
    saveError,
    editRates,
    setEditRates,
    handleEditStart,
    handleSave,
    handleCancel,
  };
}
