/**
 * Customer-facing legal disclaimers.
 *
 * Intentionally English-only across every UI locale (en/ko/cn/ja) AND the PDF.
 * Customs/duties terms are kept in a single English wording on international
 * shipping documents, mirroring the English-only PDF quote layer. This is a
 * deliberate decision — do NOT move it into `i18n/locales/*` or translate it,
 * as that would diverge the legal wording per language.
 */
export const CUSTOMS_DUTIES_DISCLAIMER = {
  title: 'Customs & Duties Disclaimer',
  body:
    'Quoted prices exclude destination duties, taxes, and customs fees. ' +
    'These charges are assessed by local customs authorities upon arrival and ' +
    'remain the sole responsibility of the recipient unless DDP (Delivered Duty Paid) ' +
    'terms are explicitly agreed upon.',
} as const;
