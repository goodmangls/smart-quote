import { describe, it, expect } from 'vitest';
import { resolveLoginRedirect } from './safeRedirect';

describe('resolveLoginRedirect', () => {
  // 화이트리스트 통과
  it('allows /insights/admin', () => {
    expect(resolveLoginRedirect('/insights/admin')).toBe('/insights/admin');
  });

  it('allows /insights nested deeper', () => {
    expect(resolveLoginRedirect('/insights/admin/posts/1')).toBe('/insights/admin/posts/1');
  });

  it('allows /dashboard', () => {
    expect(resolveLoginRedirect('/dashboard')).toBe('/dashboard');
  });

  it('allows /quote', () => {
    expect(resolveLoginRedirect('/quote')).toBe('/quote');
  });

  it('allows /admin', () => {
    expect(resolveLoginRedirect('/admin')).toBe('/admin');
  });

  it('preserves query string on whitelisted path', () => {
    expect(resolveLoginRedirect('/insights/admin?tab=stats')).toBe('/insights/admin?tab=stats');
  });

  it('preserves hash fragment on whitelisted path', () => {
    expect(resolveLoginRedirect('/dashboard#section')).toBe('/dashboard#section');
  });

  // open redirect 차단
  it('rejects absolute https URL', () => {
    expect(resolveLoginRedirect('https://evil.com')).toBeNull();
  });

  it('rejects absolute http URL', () => {
    expect(resolveLoginRedirect('http://evil.com')).toBeNull();
  });

  it('rejects protocol-relative URL', () => {
    expect(resolveLoginRedirect('//evil.com')).toBeNull();
  });

  it('rejects protocol-relative URL with whitelist-looking path', () => {
    expect(resolveLoginRedirect('//evil.com/insights/admin')).toBeNull();
  });

  it('rejects javascript: scheme', () => {
    expect(resolveLoginRedirect('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: scheme', () => {
    expect(resolveLoginRedirect('data:text/html,<script>')).toBeNull();
  });

  it('rejects vbscript: scheme', () => {
    expect(resolveLoginRedirect('vbscript:msgbox')).toBeNull();
  });

  // 비화이트리스트 path
  it('rejects unknown path', () => {
    expect(resolveLoginRedirect('/totally/random')).toBeNull();
  });

  it('rejects path that only resembles whitelist (no boundary)', () => {
    // /insightsxxx 는 /insights 화이트리스트와 별개
    expect(resolveLoginRedirect('/insightsabc')).toBeNull();
  });

  it('rejects relative path without leading slash', () => {
    expect(resolveLoginRedirect('dashboard')).toBeNull();
  });

  // edge cases
  it('rejects empty string', () => {
    expect(resolveLoginRedirect('')).toBeNull();
  });

  it('rejects null', () => {
    expect(resolveLoginRedirect(null)).toBeNull();
  });

  it('rejects undefined', () => {
    expect(resolveLoginRedirect(undefined)).toBeNull();
  });

  it('rejects non-string types', () => {
    expect(resolveLoginRedirect(123 as unknown)).toBeNull();
    expect(resolveLoginRedirect({} as unknown)).toBeNull();
  });

  it('rejects backslash-prefix (Windows-style path traversal)', () => {
    expect(resolveLoginRedirect('\\evil.com')).toBeNull();
  });
});
