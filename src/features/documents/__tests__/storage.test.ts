import { defaultQuotation, defaultTradeShipment } from '../defaults';
import { exportDraft, importDraft, loadDraft, saveDraft } from '../storage';
import { proformaDraft, quotationDraft, tradeDraft } from '../specs';

beforeEach(() => {
  window.localStorage.clear();
});

describe('draft persistence', () => {
  it('round-trips a saved draft', () => {
    const draft = { ...defaultTradeShipment(), invoiceNo: 'CI-2026-001' };
    expect(saveDraft(tradeDraft.storageKey, draft)).toBe(true);
    expect(loadDraft(tradeDraft).invoiceNo).toBe('CI-2026-001');
  });

  it('falls back to defaults when the stored value is corrupt or the wrong shape', () => {
    window.localStorage.setItem(quotationDraft.storageKey, '{not json');
    expect(loadDraft(quotationDraft)).toEqual({
      ...defaultQuotation(),
      date: loadDraft(quotationDraft).date,
    });

    window.localStorage.setItem(tradeDraft.storageKey, JSON.stringify({ items: 'nope' }));
    expect(loadDraft(tradeDraft).items).toHaveLength(1);
  });

  it('reports a failed write instead of throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(saveDraft(quotationDraft.storageKey, defaultQuotation())).toBe(false);
    spy.mockRestore();
  });
});

describe('JSON import', () => {
  it('accepts its own export', () => {
    const draft = { ...defaultQuotation(), quoteNo: 'Q-7' };
    const result = importDraft(quotationDraft, exportDraft(quotationDraft, draft));
    expect(result).toEqual({ ok: true, data: draft });
  });

  it('rejects a file exported from a different document type', () => {
    const shipment = exportDraft(tradeDraft, defaultTradeShipment());
    expect(importDraft(quotationDraft, shipment).ok).toBe(false);
    // Proforma and shipment records are near-identical in shape; the kind keeps them apart.
    expect(importDraft(proformaDraft, shipment).ok).toBe(false);
  });

  it('rejects malformed JSON and files without the export envelope', () => {
    expect(importDraft(tradeDraft, '{oops').ok).toBe(false);
    expect(importDraft(tradeDraft, JSON.stringify(defaultTradeShipment())).ok).toBe(false);
  });

  it('rejects a draft with an out-of-range value and names the field', () => {
    const bad = {
      ...defaultTradeShipment(),
      items: [{ ...defaultTradeShipment().items[0], quantity: -1 }],
    };
    const result = importDraft(tradeDraft, exportDraft(tradeDraft, bad));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('items.0.quantity') });
  });

  it('rejects a logo that is not an image data URL', () => {
    const bad = { ...defaultTradeShipment(), logo: 'javascript:alert(1)' };
    expect(importDraft(tradeDraft, exportDraft(tradeDraft, bad)).ok).toBe(false);
  });
});
