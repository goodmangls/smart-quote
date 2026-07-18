/**
 * Shared Add-on panel helpers (UI only).
 * Fee amounts always come from carrier-specific rates (UPS vs DHL normalize*).
 */

export function toggleAddonCode(selected: string[], code: string): string[] {
  return selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
}

/** Unit label under each selectable add-on row. */
export function formatAddonUnitLabel(unit: string, isEn: boolean): string {
  if (isEn) return unit;
  if (unit === 'shipment') return '발송건';
  if (unit === 'piece') return 'piece';
  return '카톤';
}

export function totalCargoPieces(items: ReadonlyArray<{ quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
