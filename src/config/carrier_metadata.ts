/**
 * Carrier Metadata — Phase 1.5 (CargoAI-inspired)
 *
 * Static metadata for carrier comparison badges & ranking.
 * These values are placeholders until Phase 1 (real-time carrier API integration)
 * provides destination-specific transit times and Phase 2 booking history
 * produces actual quality scores.
 *
 * CO2 emission factors follow IATA RP1678 (kg CO2 / tonne-km) — approximate values.
 */

export interface CarrierMetadata {
  transitDaysMin: number;
  transitDaysMax: number;
  qualityScore: number;        // 1.0 - 5.0
  emissionFactor: number;      // kg CO2 / tonne-km
}

export const CARRIER_METADATA: Record<'UPS' | 'DHL' | 'FEDEX', CarrierMetadata> = {
  UPS: {
    transitDaysMin: 2,
    transitDaysMax: 5,
    qualityScore: 4.5,
    emissionFactor: 0.602,
  },
  DHL: {
    transitDaysMin: 2,
    transitDaysMax: 4,
    qualityScore: 4.7,
    emissionFactor: 0.520,
  },
  FEDEX: {
    transitDaysMin: 3,
    transitDaysMax: 6,
    qualityScore: 4.3,
    emissionFactor: 0.645,
  },
};

/**
 * Per-carrier colours, per DESIGN.md §8.5 — UPS amber, DHL yellow, FedEx cyan.
 *
 * FedEx uses the brand `cyan-*` scale rather than Tailwind's `blue-*`, which the
 * design system bans outright. The mobile badge had its own inline ternary that
 * fell through to blue, so the same carrier looked different on mobile and
 * desktop; both surfaces now read from here.
 *
 * Written out in full rather than composed from a hue token: Tailwind scans for
 * complete class strings, so an interpolated `bg-${hue}-100` compiles to nothing.
 */
export const CARRIER_SURFACE_CLASS: Record<'UPS' | 'DHL' | 'FEDEX', string> = {
  UPS: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  DHL: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  FEDEX: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800',
};

/** Compact badge treatment of the same palette. cyan-800 on cyan-100 is 8.6:1. */
export const CARRIER_BADGE_CLASS: Record<'UPS' | 'DHL' | 'FEDEX', string> = {
  UPS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DHL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  FEDEX: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
};
