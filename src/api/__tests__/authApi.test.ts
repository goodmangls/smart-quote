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

  it('verifies magic links with credentialed cookies and an encoded token', async () => {
    json.mockResolvedValue({ token: 'access-token', user: { id: 1, email: 'u@example.com' } });

    await verifyMagicLink('token with spaces/+');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/magic_link/verify?token=token%20with%20spaces%2F%2B'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });
});
