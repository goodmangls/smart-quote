import { defaultQuotation, defaultTradeShipment } from '../defaults';
import {
  STORAGE_KEYS,
  exportDraft,
  importQuotation,
  importTradeShipment,
  loadQuotation,
  loadTradeShipment,
  saveDraft,
} from '../storage';

beforeEach(() => {
  window.localStorage.clear();
});

describe('draft persistence', () => {
  it('round-trips a saved draft', () => {
    const draft = { ...defaultTradeShipment(), invoiceNo: 'CI-2026-001' };
    expect(saveDraft('trade', draft)).toBe(true);
    expect(loadTradeShipment().invoiceNo).toBe('CI-2026-001');
  });

  it('falls back to defaults when the stored value is corrupt or the wrong shape', () => {
    window.localStorage.setItem(STORAGE_KEYS.quotation, '{not json');
    expect(loadQuotation()).toEqual({ ...defaultQuotation(), date: loadQuotation().date });

    window.localStorage.setItem(STORAGE_KEYS.trade, JSON.stringify({ items: 'nope' }));
    expect(loadTradeShipment().items).toHaveLength(1);
  });

  it('reports a failed write instead of throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(saveDraft('quotation', defaultQuotation())).toBe(false);
    spy.mockRestore();
  });
});

describe('JSON import', () => {
  it('accepts its own export', () => {
    const draft = { ...defaultQuotation(), quoteNo: 'Q-7' };
    const result = importQuotation(exportDraft('quotation', draft));
    expect(result).toEqual({ ok: true, data: draft });
  });

  it('rejects a file exported from a different document type', () => {
    const result = importQuotation(exportDraft('trade', defaultTradeShipment()));
    expect(result.ok).toBe(false);
  });

  it('rejects malformed JSON and files without the export envelope', () => {
    expect(importTradeShipment('{oops').ok).toBe(false);
    expect(importTradeShipment(JSON.stringify(defaultTradeShipment())).ok).toBe(false);
  });

  it('rejects a draft with an out-of-range value and names the field', () => {
    const bad = {
      ...defaultTradeShipment(),
      items: [{ ...defaultTradeShipment().items[0], quantity: -1 }],
    };
    const result = importTradeShipment(exportDraft('trade', bad));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('items.0.quantity') });
  });

  it('rejects a logo that is not an image data URL', () => {
    const bad = { ...defaultTradeShipment(), logo: 'javascript:alert(1)' };
    expect(importTradeShipment(exportDraft('trade', bad)).ok).toBe(false);
  });
});
