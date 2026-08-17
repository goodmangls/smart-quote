import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestMagicLink, verifyMagicLink } from '../authApi';

const json = vi.fn();

describe('authApi magic link requests', () => {
  beforeEach(() => {
    json.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json,
      }),
    );
  });

  it('requests magic links with credentialed cookies', async () => {
    json.mockResolvedValue({ message: 'sent' });

    await requestMagicLink('User@Example.COM');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/magic_link'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'User@Example.COM' }),
      }),
    );
  });

  it('verifies magic links via POST body so the token never appears in a URL', async () => {
    json.mockResolvedValue({ token: 'access-token', user: { id: 1, email: 'u@example.com' } });

    await verifyMagicLink('token with spaces/+');

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/magic_link/verify');
    expect(url).not.toContain('token=');
    expect(options).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(options.body as string)).toEqual({ token: 'token with spaces/+' });
  });
});
