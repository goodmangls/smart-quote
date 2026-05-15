import type { ZodError } from 'zod';

/**
 * Convert ZodError issues to a single human-readable string.
 * Format: "path.to.field: message; other.path: message"
 */
export function zodErrorToString(err: ZodError): string {
  return err.issues.map((e) => `${e.path.join('.') || '(root)'}: ${e.message}`).join('; ');
}
