import type { jsPDF } from 'jspdf';
import { QuoteInput, QuoteResult, PackingType } from '@/types';
import { COUNTRY_OPTIONS } from '@/config/options';
import { CUSTOMS_DUTIES_DISCLAIMER } from '@/config/disclaimers';
import { calculateCo2Kg } from '../co2';
import {
  COLORS,
  FONTS,
  MARGIN_X,
  PAGE_WIDTH,
  CONTENT_WIDTH,
  nextLine,
  CurrencyMode,
  pdfFormatKRW,
  pdfFormatUSD,
  stripEmoji,
} from './pdfUtils';

const PACKING_TYPE_LABELS: Record<string, string> = {
  [PackingType.NONE]: 'No Packing',
  [PackingType.WOODEN_BOX]: 'Wooden Box',
  [PackingType.SKID]: 'Skid',
  [PackingType.VACUUM]: 'Vacuum',
};

export const drawHeader = (
  doc: jsPDF,
  yPos: number,
  referenceNo?: string,
  validityDate?: string,
): number => {
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setFontSize(FONTS.SIZE_TITLE);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('Quotation', PAGE_WIDTH - MARGIN_X, yPos, { align: 'right' });
  yPos = nextLine(yPos, 16);
  doc.setDrawColor(...COLORS.PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, yPos, PAGE_WIDTH - MARGIN_X, yPos);
  yPos = nextLine(yPos, 8);
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.text(`Date: ${new Date().toLocaleDateString('en-US')}`, MARGIN_X, yPos);
  const ref = referenceNo || 'DRAFT';
  doc.text(`Ref: ${ref}`, PAGE_WIDTH - MARGIN_X, yPos, { align: 'right' });
  if (validityDate) {
    yPos = nextLine(yPos, 5);
    doc.text(`Valid until: ${validityDate}`, MARGIN_X, yPos);
  }
  return nextLine(yPos, 12);
};

export const drawShipmentDetails = (doc: jsPDF, input: QuoteInput, yPos: number): number => {
  doc.setFillColor(...COLORS.BG_HEADER);
  doc.roundedRect(MARGIN_X, yPos - 5, CONTENT_WIDTH, 28, 2, 2, 'F');
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('Shipment Details', MARGIN_X + 5, yPos);
  yPos = nextLine(yPos, 9);
  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setTextColor(...COLORS.TEXT);
  const rawCountryLabel =
    COUNTRY_OPTIONS.find((c) => c.code === input.destinationCountry)?.name ||
    input.destinationCountry;
  const countryLabel = stripEmoji(rawCountryLabel);
  doc.text(`Origin: ${input.originCountry}`, MARGIN_X + 5, yPos);
  doc.text(`Destination: ${countryLabel} (${input.destinationZip || '-'})`, 110, yPos);
  yPos = nextLine(yPos);
  const packingLabel = PACKING_TYPE_LABELS[input.packingType] ?? input.packingType;
  doc.text(`Shipping: ${input.shippingMode || 'Door-to-Door'}`, MARGIN_X + 5, yPos);
  doc.text(`Packing: ${packingLabel}`, 110, yPos);
  return nextLine(yPos, 15);
};

export const drawQuoteSummary = (
  doc: jsPDF,
  input: QuoteInput,
  result: QuoteResult,
  yPos: number,
  currency: CurrencyMode = 'both',
): number => {
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setFillColor(...COLORS.PRIMARY);
  doc.roundedRect(MARGIN_X, yPos, CONTENT_WIDTH, 35, 3, 3, 'F');
  doc.setTextColor(...COLORS.WHITE);
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.text('Total Quote', MARGIN_X + 8, yPos + 10);
  doc.setFontSize(20);
  if (currency === 'usd') {
    doc.text(pdfFormatUSD(result.totalQuoteAmountUSD), MARGIN_X + 8, yPos + 23);
  } else {
    doc.text(pdfFormatKRW(result.totalQuoteAmount), MARGIN_X + 8, yPos + 23);
  }
  doc.setFontSize(FONTS.SIZE_NORMAL);
  if (currency === 'both') {
    doc.text(`(Approx.${pdfFormatUSD(result.totalQuoteAmountUSD)})`, MARGIN_X + 8, yPos + 30);
  } else if (currency === 'usd') {
    doc.text(`(Approx.${pdfFormatKRW(result.totalQuoteAmount)})`, MARGIN_X + 8, yPos + 30);
  }
  const rightX = PAGE_WIDTH - MARGIN_X - 8;
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.text(`Carrier: ${result.carrier}`, rightX, yPos + 10, { align: 'right' });
  doc.text(`Zone: ${result.appliedZone}`, rightX, yPos + 17, { align: 'right' });
  doc.text(`Transit: ${result.transitTime}`, rightX, yPos + 24, { align: 'right' });
  doc.text(`Incoterm: ${input.incoterm}`, rightX, yPos + 31, { align: 'right' });
  const co2Kg = calculateCo2Kg(
    result.carrier as 'UPS' | 'DHL' | 'FEDEX',
    result.billableWeight,
    input.destinationCountry,
  );
  if (co2Kg !== null) {
    doc.text(`CO2: ${co2Kg.toFixed(1)} kg (IATA RP1678)`, rightX, yPos + 38, { align: 'right' });
    return yPos + 52;
  }
  return yPos + 45;
};

export const drawWarnings = (doc: jsPDF, warnings: string[], yPos: number): number => {
  if (warnings.length === 0) return yPos;
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setTextColor(...COLORS.WARNING);
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.text('Warnings:', MARGIN_X, yPos);
  yPos = nextLine(yPos, 5);
  warnings.forEach((w) => {
    doc.text(`• ${w}`, MARGIN_X + 3, yPos);
    yPos = nextLine(yPos, 5);
  });
  return nextLine(yPos, 5);
};

export const drawDisclaimer = (doc: jsPDF, yPos: number): number => {
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  const disclaimerEn =
    'This quotation is valid within the stated period. Surcharges are subject to change at time of booking.';
  const rateDate = `Rates as of: ${new Date().toLocaleDateString('en-US')}`;
  doc.text(disclaimerEn, MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);
  doc.text(rateDate, MARGIN_X, yPos);
  yPos = nextLine(yPos, 6);

  // Customs & Duties disclaimer (intentionally English on every quote).
  // jsPDF does not auto-paginate, so guard against overlapping the page footer.
  const customsLines = doc.splitTextToSize(
    CUSTOMS_DUTIES_DISCLAIMER.body,
    CONTENT_WIDTH,
  ) as string[];
  const pageHeight = doc.internal.pageSize.height;
  const blockHeight = 4 + customsLines.length * 4;
  if (yPos + blockHeight > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFont(FONTS.FAMILY, 'bold');
  doc.text(CUSTOMS_DUTIES_DISCLAIMER.title, MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);
  doc.setFont(FONTS.FAMILY, 'normal');
  customsLines.forEach((line) => {
    doc.text(line, MARGIN_X, yPos);
    yPos = nextLine(yPos, 4);
  });
  return nextLine(yPos, 6);
};

export const drawFooter = (doc: jsPDF) => {
  doc.setFont(FONTS.FAMILY, 'normal');
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(...COLORS.PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, pageHeight - 28, PAGE_WIDTH - MARGIN_X, pageHeight - 28);
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.text(
    'This quote is an estimate based on provided dimensions and is subject to change upon final measurement.',
    MARGIN_X,
    pageHeight - 20,
  );
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, PAGE_WIDTH - MARGIN_X, pageHeight - 12, {
    align: 'right',
  });
};

export const drawSavingsNote = (
  doc: jsPDF,
  carriers: string[],
  amounts: number[],
  exchangeRate: number,
  yPos: number,
): number => {
  const minAmount = Math.min(...amounts);
  const hasSavings = amounts.some((a) => a !== minAmount);
  if (!hasSavings) return yPos;
  const cheapestIdx = amounts.indexOf(minAmount);
  const savings = Math.max(...amounts) - minAmount;
  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text(
    `→ ${carriers[cheapestIdx]} is cheapest: ${pdfFormatKRW(savings)} saved (Approx.${pdfFormatUSD(savings / exchangeRate)})`,
    MARGIN_X,
    yPos,
  );
  return nextLine(yPos, 10);
};
