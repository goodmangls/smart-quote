/**
 * Raised when the destination country has no zone in the selected carrier's
 * official zone table. There is deliberately no fallback zone — an unmapped
 * destination must surface to the user, not be priced off a guessed zone.
 * Mirrored by Calculators::ZoneNotFoundError (smart-quote-api).
 */
export class ZoneNotFoundError extends Error {
  readonly carrier: 'UPS' | 'DHL' | 'FEDEX';
  readonly country: string;

  constructor(carrier: 'UPS' | 'DHL' | 'FEDEX', country: string) {
    super(`No ${carrier} zone mapping for destination country "${country}"`);
    this.name = 'ZoneNotFoundError';
    this.carrier = carrier;
    this.country = country;
  }
}
