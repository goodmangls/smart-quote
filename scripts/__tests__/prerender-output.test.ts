import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the prerender OUTPUT, not the script.
 *
 * The failure this exists for: LandingPage and UserGuidePage are `React.lazy`
 * inside App, and `renderToString` emits the <Suspense> fallback instead of
 * resolving them. That ships a spinner as the crawler-visible content while
 * tsc, lint, vitest, build and the SEO CI checks all stay green — the HTML is
 * valid and non-empty. Only asserting on real page text catches it.
 *
 * Skipped when dist/ is absent so `vitest run` works without a prior build;
 * CI runs build before tests, so the assertions execute there.
 */
const dist = path.resolve(process.cwd(), 'dist');
const built = fs.existsSync(path.join(dist, 'index.html'));

const read = (f: string) => fs.readFileSync(path.join(dist, f), 'utf-8');
const visibleText = (html: string) => {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? '';
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

describe.skipIf(!built)('prerendered output', () => {
  it('gives a non-rendering crawler real text on the landing page', () => {
    const text = visibleText(read('index.html'));

    expect(text).toContain('Global Freight Networks');
    expect(text.length).toBeGreaterThan(500);
  });

  it('gives a non-rendering crawler real text on the guide', () => {
    const text = visibleText(read('guide.html'));

    expect(text).toContain('User Guide');
    expect(text.length).toBeGreaterThan(2000);
  });

  // The spinner is what a Suspense fallback renders. If it is the whole body,
  // the prerender silently degraded back to shipping a shell.
  it('does not ship a loading fallback as the page body', () => {
    for (const file of ['index.html', 'guide.html']) {
      expect(visibleText(read(file)).length).toBeGreaterThan(200);
    }
  });

  it('keeps each page self-canonical', () => {
    expect(read('index.html')).toContain('href="https://bridgelogis.com"');
    expect(read('guide.html')).toContain('href="https://bridgelogis.com/guide"');
  });

  // /guide must be served from guide.html. Without an explicit rewrite ahead of
  // the SPA catch-all, Vercel would answer /guide with index.html — putting the
  // LANDING prerender on the guide URL, which is worse than the empty shell.
  it('routes /guide to guide.html ahead of the SPA catch-all', () => {
    const vercel = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf-8'),
    ) as { rewrites: { source: string; destination: string }[] };

    const guide = vercel.rewrites.findIndex((r) => r.source === '/guide');
    const catchAll = vercel.rewrites.findIndex((r) => r.destination === '/index.html');

    expect(guide).toBeGreaterThanOrEqual(0);
    expect(vercel.rewrites[guide].destination).toBe('/guide.html');
    expect(guide).toBeLessThan(catchAll);
  });
});
