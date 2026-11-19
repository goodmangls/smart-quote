import { z } from 'zod';

/**
 * Pulls a value back under its schema's upper limits: text is cut to its
 * `.max()` length, numbers are capped at their `.max()`, and lists keep their
 * first `.max()` entries. Returns a new value and never mutates the input.
 *
 * A draft that fails its schema loads as a blank document, so one value past a
 * limit used to throw away the whole draft. Running edits, stored drafts and
 * imports through this first keeps everything else the user wrote.
 *
 * Text that also has a custom check (`.refine()`, e.g. the logo) is cleared
 * rather than cut, because a cut value can't be trusted to still be valid.
 *
 * Only upper limits are fitted. A negative amount or a value of the wrong type
 * is passed through unchanged, so the schema still rejects it.
 */
export const fitToSchema = (schema: z.ZodType, value: unknown): unknown => {
  if (
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable
  ) {
    return value == null ? value : fitToSchema(schema.unwrap() as z.ZodType, value);
  }
  if (schema instanceof z.ZodString) {
    const max = schema.maxLength;
    if (typeof value !== 'string' || max == null || value.length <= max) return value;
    // A custom check (the logo's data-URL test) can't vouch for a cut value: a
    // truncated image still passes the prefix test but no longer renders.
    return hasCustomCheck(schema) ? '' : value.slice(0, max);
  }
  if (schema instanceof z.ZodNumber) {
    const max = schema.maxValue;
    return typeof value === 'number' && max != null && value > max ? max : value;
  }
  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(value)) return value;
    const max = arrayMaxLength(schema);
    const kept = max != null && value.length > max ? value.slice(0, max) : value;
    return kept.map((item) => fitToSchema(schema.element as z.ZodType, item));
  }
  if (schema instanceof z.ZodObject) {
    if (!isRecord(value)) return value;
    const fitted: Record<string, unknown> = { ...value };
    for (const [key, field] of Object.entries(schema.shape as Record<string, z.ZodType>)) {
      if (Object.hasOwn(value, key)) fitted[key] = fitToSchema(field, value[key]);
    }
    return fitted;
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const checkDefs = (schema: z.ZodType): { check: string; maximum?: number }[] =>
  (schema._zod.def.checks ?? []).map(
    (check) => check._zod.def as { check: string; maximum?: number },
  );

/** `.refine()` adds a `custom` check to the schema it is called on. */
const hasCustomCheck = (schema: z.ZodType): boolean =>
  checkDefs(schema).some((def) => def.check === 'custom');

/** Zod keeps a list's `.max()` as a `max_length` check rather than a property. */
const arrayMaxLength = (schema: z.ZodArray): number | undefined =>
  checkDefs(schema).find((def) => def.check === 'max_length')?.maximum;
