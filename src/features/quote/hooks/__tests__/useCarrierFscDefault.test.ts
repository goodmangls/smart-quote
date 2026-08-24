import { renderHook } from '@testing-library/react';
import { useCarrierFscDefault } from '../useCarrierFscDefault';
import {
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
  DEFAULT_FSC_PERCENT_FEDEX,
} from '@/config/rates';

const mockUseFscRates = vi.hoisted(() => vi.fn());

vi.mock('@/features/dashboard/hooks/useFscRates', () => ({
  useFscRates: mockUseFscRates,
}));

// Deliberately unlike any shipped constant. If a test used today's real rate,
// it would stop discriminating the moment that rate is applied to rates.ts —
// which is exactly what happened when these were first written.
const DB_UPS = 50.5;
const DB_DHL = 51.5;
const DB_FEDEX = 52.5;

/** Shape returned by GET /api/v1/fsc/rates. */
const dbRates = (ups: number, dhl: number, fedex: number) => ({
  data: {
    rates: {
      UPS: { international: ups, domestic: ups },
      DHL: { international: dhl, domestic: dhl },
      FEDEX: { international: fedex, domestic: fedex },
    },
    updatedAt: '2026-08-24T00:00:00Z',
  },
  loading: false,
  error: null,
  retry: vi.fn(),
});

/** What the hook sees before the request resolves — the constants, per useFscRates. */
const stillLoading = () =>
  dbRates(DEFAULT_FSC_PERCENT, DEFAULT_FSC_PERCENT_DHL, DEFAULT_FSC_PERCENT_FEDEX);

beforeEach(() => {
  mockUseFscRates.mockReset();
});

/**
 * The admin FSC widget writes to the DB, and the backend already quotes from
 * that row. The calculator used to read a hardcoded constant instead, so a rate
 * raised in the widget never reached a quote — on 2026-08-24 that had UPS
 * quoting at 44.25% while the DB said 47.00%.
 *
 * This hook makes the DB the default. The constant stays as the value used
 * while the request is in flight or if it fails, so a quote is never blocked on
 * the network.
 */
describe('useCarrierFscDefault', () => {
  it('resolves the DB rate for the selected carrier', () => {
    mockUseFscRates.mockReturnValue(dbRates(DB_UPS, DB_DHL, DB_FEDEX));
    const onApply = vi.fn();

    const { result } = renderHook(() =>
      useCarrierFscDefault({ carrier: 'DHL', fscPercent: 42.5, onApply })
    );

    expect(result.current).toBe(DB_DHL);
  });

  it('falls back to the constant when the DB has no row for the carrier', () => {
    mockUseFscRates.mockReturnValue({
      data: { rates: { UPS: { international: DB_UPS, domestic: DB_UPS } }, updatedAt: '' },
      loading: false,
      error: null,
      retry: vi.fn(),
    });
    const onApply = vi.fn();

    const { result } = renderHook(() =>
      useCarrierFscDefault({ carrier: 'FEDEX', fscPercent: DEFAULT_FSC_PERCENT_FEDEX, onApply })
    );

    expect(result.current).toBe(DEFAULT_FSC_PERCENT_FEDEX);
  });

  it('applies the DB rate once it arrives, replacing the constant', () => {
    mockUseFscRates.mockReturnValue(stillLoading());
    const onApply = vi.fn();

    const { rerender } = renderHook((props: { fsc: number }) =>
      useCarrierFscDefault({ carrier: 'UPS', fscPercent: props.fsc, onApply })
    , { initialProps: { fsc: DEFAULT_FSC_PERCENT } });

    onApply.mockClear();
    mockUseFscRates.mockReturnValue(dbRates(DB_UPS, DB_DHL, DB_FEDEX));
    rerender({ fsc: DEFAULT_FSC_PERCENT });

    expect(onApply).toHaveBeenCalledWith(DB_UPS);
  });

  // The race this guards: the request takes a moment, and a user who types a
  // negotiated rate in the meantime must not have it overwritten when the
  // response lands.
  it('does not overwrite a rate the user typed while the request was in flight', () => {
    mockUseFscRates.mockReturnValue(stillLoading());
    const onApply = vi.fn();

    const { rerender } = renderHook((props: { fsc: number }) =>
      useCarrierFscDefault({ carrier: 'UPS', fscPercent: props.fsc, onApply })
    , { initialProps: { fsc: DEFAULT_FSC_PERCENT } });

    // User types 20 before the DB responds.
    rerender({ fsc: 20 });
    onApply.mockClear();

    mockUseFscRates.mockReturnValue(dbRates(DB_UPS, DB_DHL, DB_FEDEX));
    rerender({ fsc: 20 });

    expect(onApply).not.toHaveBeenCalled();
  });

  it('applies the new carrier default on a carrier switch even after a manual edit', () => {
    mockUseFscRates.mockReturnValue(dbRates(DB_UPS, DB_DHL, DB_FEDEX));
    const onApply = vi.fn();

    const { rerender } = renderHook(
      (props: { carrier: string; fsc: number }) =>
        useCarrierFscDefault({ carrier: props.carrier, fscPercent: props.fsc, onApply }),
      { initialProps: { carrier: 'UPS', fsc: DB_UPS } }
    );

    rerender({ carrier: 'UPS', fsc: 20 });
    onApply.mockClear();

    rerender({ carrier: 'DHL', fsc: 20 });

    expect(onApply).toHaveBeenCalledWith(DB_DHL);
  });

  it('does not re-apply when the value already equals the default', () => {
    mockUseFscRates.mockReturnValue(dbRates(DB_UPS, DB_DHL, DB_FEDEX));
    const onApply = vi.fn();

    renderHook(() => useCarrierFscDefault({ carrier: 'UPS', fscPercent: DB_UPS, onApply }));

    expect(onApply).not.toHaveBeenCalled();
  });

  it('keeps an explicit 0 rather than treating it as untouched', () => {
    mockUseFscRates.mockReturnValue(dbRates(DB_UPS, DB_DHL, DB_FEDEX));
    const onApply = vi.fn();

    const { rerender } = renderHook((props: { fsc: number }) =>
      useCarrierFscDefault({ carrier: 'UPS', fscPercent: props.fsc, onApply })
    , { initialProps: { fsc: DB_UPS } });

    rerender({ fsc: 0 });
    onApply.mockClear();
    rerender({ fsc: 0 });

    expect(onApply).not.toHaveBeenCalled();
  });
});
