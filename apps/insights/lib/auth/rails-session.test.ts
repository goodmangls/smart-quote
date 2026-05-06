import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { fetchSessionUser } from './rails-session';

function makeRequest(cookies: Record<string, string>): NextRequest {
  return {
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name], name } : undefined),
    },
    headers: {
      get: (_: string) => null,
    },
  } as unknown as NextRequest;
}

describe('fetchSessionUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('RAILS_API_URL', 'https://api.example.com');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns null when bl_session cookie is missing', async () => {
    const req = makeRequest({});
    const result = await fetchSessionUser(req);
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns SessionUser when /me returns 200 with flat shape', async () => {
    const req = makeRequest({ bl_session: 'jwt-token-here' });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 42, email: 'admin@example.com', role: 'admin' }),
    });

    const result = await fetchSessionUser(req);

    expect(result).toEqual({ id: 42, email: 'admin@example.com', role: 'admin' });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/auth/me');
    expect((init as RequestInit).cache).toBe('no-store');
    const authHeader = (init as RequestInit).headers as Record<string, string>;
    expect(authHeader.Authorization).toBe('Bearer jwt-token-here');
  });

  it('returns SessionUser when /me returns 200 with wrapped shape ({ user: ... })', async () => {
    // OI-5 호환 — controller 가 평면이든 { user: ... } 형태든 양쪽 처리
    const req = makeRequest({ bl_session: 'jwt-token-here' });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 7, email: 'm@x.com', role: 'member' } }),
    });

    const result = await fetchSessionUser(req);
    expect(result).toEqual({ id: 7, email: 'm@x.com', role: 'member' });
  });

  it('returns null when /me returns 401', async () => {
    const req = makeRequest({ bl_session: 'expired-token' });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED' } }),
    });

    const result = await fetchSessionUser(req);
    expect(result).toBeNull();
  });

  it('returns null when fetch rejects (network error)', async () => {
    const req = makeRequest({ bl_session: 'jwt' });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));

    const result = await fetchSessionUser(req);
    expect(result).toBeNull();
  });

  it('returns null when /me returns malformed body (no role field)', async () => {
    const req = makeRequest({ bl_session: 'jwt' });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, email: 'a@b.com' }),
    });

    const result = await fetchSessionUser(req);
    expect(result).toBeNull();
  });

  it('throws when RAILS_API_URL env is missing', async () => {
    vi.stubEnv('RAILS_API_URL', '');
    const req = makeRequest({ bl_session: 'jwt' });

    await expect(fetchSessionUser(req)).rejects.toThrow(/RAILS_API_URL/);
  });
});
