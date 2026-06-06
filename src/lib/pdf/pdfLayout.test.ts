import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawDisclaimer } from './pdfLayout';
import { CUSTOMS_DUTIES_DISCLAIMER } from '@/config/disclaimers';

/**
 * Layout-level checks for the customs & duties block using REAL jsPDF, so the
 * body actually wraps to multiple lines (the unit mock collapses it to one).
 * This exercises both branches of the no-auto-paginate overflow guard and
 * proves the block clears the pinned page footer (drawFooter @ pageHeight-20/-28).
 */
describe('drawDisclaimer — customs block layout (real jsPDF)', () => {
  it('wraps the customs body into multiple lines', () => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(CUSTOMS_DUTIES_DISCLAIMER.body, 170) as string[];
    expect(lines.length).toBeGreaterThan(1); // genuinely wraps, not one long line
  });

  it('keeps the block clear of the page footer when there is room', () => {
    const doc = new jsPDF();
    const startPages = doc.getNumberOfPages();
    const endY = drawDisclaimer(doc, 60);

    expect(doc.getNumberOfPages()).toBe(startPages); // no page break needed
    const pageHeight = doc.internal.pageSize.height;
    expect(endY).toBeLessThan(pageHeight - 28); // sits above the footer line
  });

  it('adds a page when the block would collide with the footer', () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const endY = drawDisclaimer(doc, pageHeight - 35); // near the bottom

    expect(doc.getNumberOfPages()).toBe(2); // guard fired
    expect(endY).toBeLessThan(60); // continued near the top of the new page
  });
});
