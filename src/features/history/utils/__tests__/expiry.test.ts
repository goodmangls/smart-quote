import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getExpiryInfo } from '../expiry';

/**
 * 기준 시각 고정: 2026-06-15T00:00:00Z (UTC). 모든 expected daysLeft 는 이 시각 기준.
 */
const FIXED_NOW = new Date('2026-06-15T00:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getExpiryInfo', () => {
  it('미래 10일 → daysLeft 10, expired false, severity ok', () => {
    const result = getExpiryInfo('2026-06-25T00:00:00Z');
    expect(result).toEqual({ daysLeft: 10, expired: false, severity: 'ok' });
  });

  it('미래 3일 → severity soon (경계, ≤3)', () => {
    const result = getExpiryInfo('2026-06-18T00:00:00Z');
    expect(result.daysLeft).toBe(3);
    expect(result.expired).toBe(false);
    expect(result.severity).toBe('soon');
  });

  it('미래 1일 → severity soon', () => {
    const result = getExpiryInfo('2026-06-16T00:00:00Z');
    expect(result.daysLeft).toBe(1);
    expect(result.expired).toBe(false);
    expect(result.severity).toBe('soon');
  });

  it('오늘 (daysLeft 0) → expired true, severity expired', () => {
    const result = getExpiryInfo('2026-06-15T00:00:00Z');
    expect(result.daysLeft).toBe(0);
    expect(result.expired).toBe(true);
    expect(result.severity).toBe('expired');
  });

  it('과거 1일 → daysLeft 음수, expired true, severity expired', () => {
    const result = getExpiryInfo('2026-06-14T00:00:00Z');
    expect(result.daysLeft).toBeLessThanOrEqual(0);
    expect(result.expired).toBe(true);
    expect(result.severity).toBe('expired');
  });

  it('경계 4일 → severity ok (3 초과)', () => {
    const result = getExpiryInfo('2026-06-19T00:00:00Z');
    expect(result.daysLeft).toBe(4);
    expect(result.severity).toBe('ok');
  });

  it("'YYYY-MM-DD' 단순 날짜 형식도 허용", () => {
    const result = getExpiryInfo('2026-06-25');
    expect(result.daysLeft).toBeGreaterThan(0);
    expect(result.severity).toBe('ok');
  });
});
