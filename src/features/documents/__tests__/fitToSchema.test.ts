import { z } from 'zod';
import { fitToSchema } from '../fitToSchema';

const schema = z.object({
  name: z.string().max(5),
  rate: z.number().min(0).max(100),
  tags: z.array(z.string().max(2)).max(2),
  nested: z.object({ note: z.string().max(3) }).default({ note: '' }),
  free: z.string(),
});

describe('fitToSchema', () => {
  it('trims text, caps numbers and lists at their schema maximum', () => {
    const fitted = fitToSchema(schema, {
      name: 'abcdefgh',
      rate: 150,
      tags: ['aaa', 'b', 'c'],
      nested: { note: 'long' },
      free: 'x'.repeat(50),
    });
    expect(fitted).toEqual({
      name: 'abcde',
      rate: 100,
      tags: ['aa', 'b'],
      nested: { note: 'lon' },
      free: 'x'.repeat(50),
    });
    expect(schema.safeParse(fitted).success).toBe(true);
  });

  it('leaves values that are already within limits unchanged', () => {
    const value = { name: 'ok', rate: 10, tags: ['a'], nested: { note: 'n' }, free: '' };
    expect(fitToSchema(schema, value)).toEqual(value);
  });

  it('does not repair lower bounds or wrong types, so the schema still rejects them', () => {
    const fitted = fitToSchema(schema, { name: 7, rate: -1, tags: 'nope', nested: null, free: '' });
    expect(fitted).toEqual({ name: 7, rate: -1, tags: 'nope', nested: null, free: '' });
    expect(schema.safeParse(fitted).success).toBe(false);
  });

  it('clears an over-long value with a custom check rather than cutting it', () => {
    // Cutting a data URL leaves a string that passes the prefix check but is a broken image.
    const logo = z
      .string()
      .max(8)
      .refine((v) => v === '' || v.startsWith('data:'));
    expect(fitToSchema(logo, 'data:abcdefgh')).toBe('');
    expect(fitToSchema(logo, 'data:ab')).toBe('data:ab');
  });

  it('does not mutate its input', () => {
    const input = {
      name: 'abcdefgh',
      rate: 150,
      tags: ['aaa'],
      nested: { note: 'long' },
      free: '',
    };
    const copy = structuredClone(input);
    fitToSchema(schema, input);
    expect(input).toEqual(copy);
  });
});
