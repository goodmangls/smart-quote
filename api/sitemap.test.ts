import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './sitemap';

/**
 * The 2026-08-26 SEO audit found two problems here, both verified against
 * production:
 *   1. /quote was advertised at priority 0.9, but it sits behind ProtectedRoute
 *      and answers an unauthenticated crawler with a redirect to /login.
 *   2. Every entry carried `lastmod = today`, regenerated per request, so the
 *      whole sitemap claimed to have changed on every single crawl.
 * These pin both so neither can quietly come back.
 */
function invoke() {
  const headers: Record<string, string> = {};
  let body = '';
  let status = 0;

  const res = {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    status: (code: number) => {
      status = code;
      return res;
    },
    send: (payload: string) => {
      body = payload;
      return res;
    },
  } as unknown as VercelResponse;

  return handler({} as VercelRequest, res).then(() => ({ headers, body, status }));
}

describe('GET /sitemap.xml', () => {
  it('serves valid XML with a 200', async () => {
    const { status, body, headers } = await invoke();

    expect(status).toBe(200);
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(body).toContain('</urlset>');
    expect(headers['Content-Type']).toMatch(/application\/xml/);
  });

  it('lists the public pages', async () => {
    const { body } = await invoke();

    expect(body).toContain('<loc>https://bridgelogis.com/</loc>');
    expect(body).toContain('<loc>https://bridgelogis.com/guide</loc>');
  });

  // The load-bearing assertion. /quote redirects an unauthenticated crawler to
  // /login, so advertising it spends crawl budget on a dead index entry.
  it('does not advertise auth-gated routes', async () => {
    const { body } = await invoke();

    for (const gated of ['/quote', '/admin', '/dashboard', '/schedule', '/login', '/signup']) {
      expect(body).not.toContain(`<loc>https://bridgelogis.com${gated}</loc>`);
    }
  });

  // A lastmod that is always "today" is a freshness claim the site cannot back,
  // and Google learns to discount it. No lastmod beats a false one.
  it('emits no lastmod unless an entry carries a real date', async () => {
    const { body } = await invoke();

    expect(body).not.toContain('<lastmod>');
  });

  it('keeps the sitemap itself out of the index', async () => {
    const { headers } = await invoke();

    expect(headers['X-Robots-Tag']).toBe('noindex');
  });
});
