import { QuoteInput, QuoteResult } from '@/types';
import {
  buildFilename,
  CurrencyMode,
  FONTS,
  COLORS,
  MARGIN_X,
  nextLine,
  getLastAutoTableY,
} from './pdf/pdfUtils';
import {
  drawHeader,
  drawShipmentDetails,
  drawQuoteSummary,
  drawWarnings,
  drawDisclaimer,
  drawFooter,
  drawSavingsNote,
} from './pdf/pdfLayout';
import {
  drawCargoTable,
  drawCostTable,
  buildComparisonRows,
  makeDidParseCell,
} from './pdf/pdfTables';

export const generatePDF = async (
  input: QuoteInput,
  result: QuoteResult,
  referenceNo?: string,
  options?: { isAdmin?: boolean; isKorean?: boolean; currency?: CurrencyMode },
) => {
  const currency: CurrencyMode =
    options?.currency ?? (options?.isAdmin ? 'both' : options?.isKorean ? 'krw' : 'usd');
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF();

  const validityDate = referenceNo
    ? new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US')
    : undefined;

  let yPos = 20;
  yPos = drawHeader(doc, yPos, referenceNo, validityDate);
  yPos = drawShipmentDetails(doc, input, yPos);
  const volDivisor = 5000;
  yPos = await drawCargoTable(doc, input.items, result, yPos, input.packingType, volDivisor);
  doc.setFont(FONTS.FAMILY, 'normal');
  yPos = await drawCostTable(doc, result, yPos, currency);
  doc.setFont(FONTS.FAMILY, 'normal');
  yPos = drawQuoteSummary(doc, input, result, yPos, currency);
  yPos = drawWarnings(doc, result.warnings, yPos);
  drawDisclaimer(doc, yPos);
  drawFooter(doc);

  doc.save(buildFilename('BridgeLogis_Quote', referenceNo));
};

export const generateComparisonPDF = async (
  input: QuoteInput,
  upsResult: QuoteResult,
  dhlResult: QuoteResult,
): Promise<void> => {
  const { jsPDF: JsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new JsPDF();

  const carriers = ['UPS', 'DHL'];
  const results = [upsResult, dhlResult];
  const amounts = results.map((r) => r.totalQuoteAmount);
  const minAmount = Math.min(...amounts);
  const validityDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US');

  let yPos = 20;
  yPos = drawHeader(doc, yPos, undefined, validityDate);

  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('Carrier Comparison Report', MARGIN_X, yPos);
  yPos = nextLine(yPos, 10);

  yPos = drawShipmentDetails(doc, input, yPos);
  yPos = await drawCargoTable(doc, input.items, upsResult, yPos, input.packingType);
  doc.setFont(FONTS.FAMILY, 'normal');

  const { headRow, bodyRows } = buildComparisonRows(results, carriers);
  autoTable(doc, {
    startY: yPos,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.PRIMARY as [number, number, number],
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      halign: 'center',
    },
    bodyStyles: { font: FONTS.FAMILY, fontSize: FONTS.SIZE_TABLE, halign: 'center' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 } },
    didParseCell: makeDidParseCell(amounts, minAmount),
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  yPos = getLastAutoTableY(doc) + 10;
  doc.setFont(FONTS.FAMILY, 'normal');
  yPos = drawSavingsNote(doc, carriers, amounts, input.exchangeRate, yPos);
  drawDisclaimer(doc, yPos);
  drawFooter(doc);
  doc.save(buildFilename('BridgeLogis_Comparison'));
};
