import { describe, expect, it } from 'vitest';
import { formatAddonUnitLabel, toggleAddonCode, totalCargoPieces } from './addOnPanelHelpers';

describe('addOnPanelHelpers', () => {
  describe('toggleAddonCode', () => {
    it('adds a missing code', () => {
      expect(toggleAddonCode(['RMT'], 'ADC')).toEqual(['RMT', 'ADC']);
    });

    it('removes an existing code', () => {
      expect(toggleAddonCode(['RMT', 'ADC'], 'RMT')).toEqual(['ADC']);
    });
  });

  describe('formatAddonUnitLabel', () => {
    it('returns English unit as-is', () => {
      expect(formatAddonUnitLabel('shipment', true)).toBe('shipment');
      expect(formatAddonUnitLabel('piece', true)).toBe('piece');
    });

    it('localizes Korean units (shared by UPS/DHL UI)', () => {
      expect(formatAddonUnitLabel('shipment', false)).toBe('발송건');
      expect(formatAddonUnitLabel('piece', false)).toBe('piece');
      expect(formatAddonUnitLabel('carton', false)).toBe('카톤');
    });
  });

  describe('totalCargoPieces', () => {
    it('sums quantity across items', () => {
      expect(totalCargoPieces([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
    });
  });
});
