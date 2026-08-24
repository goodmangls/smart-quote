import { useEffect, useRef } from 'react';
import { useFscRates } from '@/features/dashboard/hooks/useFscRates';
import { defaultFscFor } from '@/config/rates';

interface Params {
  /** Currently selected carrier. */
  carrier: string;
  /** Current fscPercent on the quote input. */
  fscPercent: number;
  /** Called with the rate to apply. Only fires when a change is warranted. */
  onApply: (next: number) => void;
}

/**
 * Resolves the fuel surcharge the calculator should default to, and keeps the
 * quote input in step with it.
 *
 * The admin FSC widget writes to the DB and the backend already quotes from
 * that row, but the calculator read a hardcoded constant — so a rate raised in
 * the widget never reached a quote. On 2026-08-24 that meant UPS quoting at
 * 44.25% while the DB said 47.00%, roughly 1.9% under on every UPS quote.
 *
 * The constant is still the value used while the request is in flight or if it
 * fails (useFscRates seeds its state with the constants), so a quote is never
 * blocked on the network — it just starts from last week's figure and corrects
 * itself when the response lands.
 *
 * @returns the resolved default, for surfaces that need it directly — the FSC
 * input uses it to decide what an emptied field falls back to.
 */
export function useCarrierFscDefault({ carrier, fscPercent, onApply }: Params): number {
  const { data } = useFscRates();

  const resolved =
    data?.rates?.[carrier as keyof typeof data.rates]?.international ?? defaultFscFor(carrier);

  // The rate this hook last handed out. While the field still holds it, nobody
  // has typed over it and a newly arrived DB rate may replace it. Seeded with
  // the value present on first render so an edit made before the response lands
  // is protected too — that race is the whole reason this is a ref and not a
  // plain "did it change" check.
  const appliedRef = useRef<number>(fscPercent);
  const carrierRef = useRef<string>(carrier);

  useEffect(() => {
    const carrierChanged = carrierRef.current !== carrier;
    // `===` on purpose: an explicit 0 is a real rate, not an absent one.
    const untouched = fscPercent === appliedRef.current;

    if (!carrierChanged && !untouched) return;

    carrierRef.current = carrier;
    if (fscPercent !== resolved) {
      appliedRef.current = resolved;
      onApply(resolved);
    }
  }, [carrier, fscPercent, resolved, onApply]);

  return resolved;
}
