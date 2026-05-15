import { z } from 'zod';

export const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']);
export const amountCurrencySchema = z.enum(['KRW', 'USD']);

const datePatternSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

export const quoteListParamsSchema = z.object({
  page: z.number().int().min(1).max(10000).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  q: z.string().max(200).optional(),
  destinationCountry: z.string().length(2).optional(),
  dateFrom: datePatternSchema.optional(),
  dateTo: datePatternSchema.optional(),
  status: quoteStatusSchema.optional(),
  minAmount: z.number().min(0).max(1e12).optional(),
  maxAmount: z.number().min(0).max(1e12).optional(),
  amountCurrency: amountCurrencySchema.optional(),
});
