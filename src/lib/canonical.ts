/** Canonical URL for a client-side route.
 *
 *  Every route is served the same index.html, whose baked-in canonical is the
 *  homepage. Left alone, /guide — the only public page with substantial
 *  content — declares itself a duplicate of / while sitemap.xml asks Google to
 *  index it. Verified against production 2026-08-26: all sitemap URLs returned
 *  byte-identical HTML with `canonical → https://bridgelogis.com`.
 */
export const SITE_ORIGIN = 'https://bridgelogis.com';

/** `/` stays the bare origin so it remains identical to the value already in
 *  index.html and to og:url. Any other route becomes self-referential, with a
 *  trailing slash stripped so one page cannot claim two canonicals. */
export function canonicalFor(pathname: string): string {
  if (pathname === '/') return SITE_ORIGIN;
  return SITE_ORIGIN + pathname.replace(/\/+$/, '');
}
