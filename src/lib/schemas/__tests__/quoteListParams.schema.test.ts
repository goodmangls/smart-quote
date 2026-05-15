import { quoteListParamsSchema } from '../quoteListParams.schema';

describe('quoteListParamsSchema — valid', () => {
  it('accepts an empty object (all optional)', () => {
    expect(quoteListParamsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a fully populated object', () => {
    const r = quoteListParamsSchema.safeParse({
      page: 1,
      perPage: 20,
      q: 'SQ-2026',
      destinationCountry: 'US',
      dateFrom: '2026-01-01',
      dateTo: '2026-05-15',
      status: 'sent',
      minAmount: 1000,
      maxAmount: 50000,
      amountCurrency: 'USD',
    });
    expect(r.success).toBe(true);
  });
});

describe('quoteListParamsSchema — date format', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(quoteListParamsSchema.safeParse({ dateFrom: '2026-05-15' }).success).toBe(true);
  });

  it('rejects slash-separated date', () => {
    expect(quoteListParamsSchema.safeParse({ dateFrom: '2026/05/15' }).success).toBe(false);
  });

  it('rejects incomplete date', () => {
    expect(quoteListParamsSchema.safeParse({ dateTo: '2026-5-1' }).success).toBe(false);
  });
});

describe('quoteListParamsSchema — failures', () => {
  it('rejects page 0', () => {
    expect(quoteListParamsSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects non-integer page', () => {
    expect(quoteListParamsSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });

  it('rejects perPage over 100', () => {
    expect(quoteListParamsSchema.safeParse({ perPage: 500 }).success).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(quoteListParamsSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('rejects invalid amountCurrency', () => {
    expect(quoteListParamsSchema.safeParse({ amountCurrency: 'EUR' }).success).toBe(false);
  });

  it('rejects destinationCountry not 2-letter', () => {
    expect(quoteListParamsSchema.safeParse({ destinationCountry: 'USA' }).success).toBe(false);
  });

  it('rejects negative minAmount', () => {
    expect(quoteListParamsSchema.safeParse({ minAmount: -100 }).success).toBe(false);
  });

  it('rejects q longer than 200 chars', () => {
    expect(quoteListParamsSchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(false);
  });
});
