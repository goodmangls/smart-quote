import { quoteInputSchema, cargoItemSchema } from '../quoteInput.schema';

const validItem = {
  id: 'item-1',
  width: 30,
  length: 40,
  height: 20,
  weight: 5,
  quantity: 2,
};

const validInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '10001',
  incoterm: 'DAP',
  packingType: 'Carton Box',
  items: [validItem],
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: 1400,
  fscPercent: 45.5,
};

function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

describe('cargoItemSchema', () => {
  it('accepts a valid item', () => {
    expect(cargoItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejects zero weight', () => {
    expect(cargoItemSchema.safeParse({ ...validItem, weight: 0 }).success).toBe(false);
  });

  it('rejects negative dimension', () => {
    expect(cargoItemSchema.safeParse({ ...validItem, width: -1 }).success).toBe(false);
  });

  it('rejects dimension over 1000cm', () => {
    expect(cargoItemSchema.safeParse({ ...validItem, length: 2000 }).success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    expect(cargoItemSchema.safeParse({ ...validItem, quantity: 1.5 }).success).toBe(false);
  });

  it('rejects empty id', () => {
    expect(cargoItemSchema.safeParse({ ...validItem, id: '' }).success).toBe(false);
  });
});

describe('quoteInputSchema — valid', () => {
  it('accepts a standard input', () => {
    expect(quoteInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts multiple items', () => {
    const r = quoteInputSchema.safeParse({
      ...validInput,
      items: [validItem, { ...validItem, id: 'item-2' }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts optional carrier + add-ons', () => {
    const r = quoteInputSchema.safeParse({
      ...validInput,
      overseasCarrier: 'DHL',
      dhlAddOns: ['SAT', 'RES'],
    });
    expect(r.success).toBe(true);
  });

  it('applies default for destinationZip and dutyTaxEstimate', () => {
    const noDefaults = omit(validInput, 'dutyTaxEstimate', 'destinationZip');
    const r = quoteInputSchema.safeParse(noDefaults);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.destinationZip).toBe('');
      expect(r.data.dutyTaxEstimate).toBe(0);
    }
  });
});

describe('quoteInputSchema — boundary', () => {
  it('accepts marginPercent 0 and 100', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, marginPercent: 0 }).success).toBe(true);
    expect(quoteInputSchema.safeParse({ ...validInput, marginPercent: 100 }).success).toBe(true);
  });

  it('accepts fscPercent 0 and 200', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, fscPercent: 0 }).success).toBe(true);
    expect(quoteInputSchema.safeParse({ ...validInput, fscPercent: 200 }).success).toBe(true);
  });
});

describe('quoteInputSchema — required failures', () => {
  it('rejects missing destinationCountry', () => {
    expect(quoteInputSchema.safeParse(omit(validInput, 'destinationCountry')).success).toBe(false);
  });

  it('rejects empty items array', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, items: [] }).success).toBe(false);
  });

  it('rejects missing incoterm', () => {
    expect(quoteInputSchema.safeParse(omit(validInput, 'incoterm')).success).toBe(false);
  });
});

describe('quoteInputSchema — enum failures', () => {
  it('rejects invalid incoterm', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, incoterm: 'INVALID' }).success).toBe(false);
  });

  it('rejects invalid packingType', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, packingType: 'Glass Box' }).success).toBe(
      false,
    );
  });

  it('rejects invalid overseasCarrier', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, overseasCarrier: 'FEDEX' }).success).toBe(
      false,
    );
  });
});

describe('quoteInputSchema — range failures', () => {
  it('rejects marginPercent over 100', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, marginPercent: 150 }).success).toBe(false);
  });

  it('rejects negative marginPercent', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, marginPercent: -5 }).success).toBe(false);
  });

  it('rejects exchangeRate over 10000', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, exchangeRate: 20000 }).success).toBe(false);
  });

  it('rejects zero exchangeRate', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, exchangeRate: 0 }).success).toBe(false);
  });

  it('rejects fscPercent over 200', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, fscPercent: 300 }).success).toBe(false);
  });

  it('rejects originCountry not 2-letter', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, originCountry: 'KOR' }).success).toBe(false);
  });
});

describe('quoteInputSchema — type failures', () => {
  it('rejects string weight in item', () => {
    const r = quoteInputSchema.safeParse({
      ...validInput,
      items: [{ ...validItem, weight: '5' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects null items', () => {
    expect(quoteInputSchema.safeParse({ ...validInput, items: null }).success).toBe(false);
  });
});

describe('quoteInputSchema — array bounds', () => {
  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ ...validItem, id: `item-${i}` }));
    expect(quoteInputSchema.safeParse({ ...validInput, items }).success).toBe(false);
  });

  it('rejects more than 30 dhlAddOns', () => {
    const dhlAddOns = Array.from({ length: 31 }, (_, i) => `CODE${i}`);
    expect(quoteInputSchema.safeParse({ ...validInput, dhlAddOns }).success).toBe(false);
  });
});
