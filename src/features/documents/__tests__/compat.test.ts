import v1 from './fixtures/v1-drafts.json';
import { importDraft, loadDraft } from '../storage';
import { quotationDraft, tradeDraft } from '../specs';

/**
 * Drafts saved and files exported by the first release (PR #142) must keep
 * loading. A schema change that fails them would not error — `loadWith` falls
 * back to a blank draft and the user's work silently disappears.
 *
 * The fixture is frozen: never regenerate it from current defaults.
 */

const v1Export = (kind: string, data: unknown) => JSON.stringify({ kind, version: 1, data });

beforeEach(() => {
  window.localStorage.clear();
});

describe('v1 draft compatibility', () => {
  it('gives a v1 shipment draft the shipping-instruction block it never had', () => {
    window.localStorage.setItem('smartQuote.documents.trade', JSON.stringify(v1.trade));
    expect(loadDraft(tradeDraft).instructions.freightPaidBy).toBe('shipper');
  });

  it('loads a v1 quotation draft from localStorage intact', () => {
    // The v1 key name, written out — not read from the spec, so a rename fails here.
    window.localStorage.setItem('smartQuote.documents.quotation', JSON.stringify(v1.quotation));
    expect(loadDraft(quotationDraft)).toMatchObject(v1.quotation);
  });

  it('loads a v1 commercial invoice / packing list draft from localStorage intact', () => {
    window.localStorage.setItem('smartQuote.documents.trade', JSON.stringify(v1.trade));
    expect(loadDraft(tradeDraft)).toMatchObject(v1.trade);
  });

  it('imports v1 JSON exports', () => {
    expect(importDraft(quotationDraft, v1Export('quotation', v1.quotation))).toMatchObject({
      ok: true,
      data: v1.quotation,
    });
    expect(importDraft(tradeDraft, v1Export('trade-shipment', v1.trade))).toMatchObject({
      ok: true,
      data: v1.trade,
    });
  });
});
