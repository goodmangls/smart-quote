import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalFor } from '@/lib/canonical';

/** Keeps `<link rel="canonical">` in step with the current route.
 *
 *  ⚠️ This only reaches crawlers that execute JavaScript. Googlebot does, so
 *  indexing is fixed. Crawlers that read raw HTML (most AI bots) still see the
 *  homepage canonical from index.html — only per-route static HTML
 *  (prerender/SSG) fixes that, which is a separate, larger change.
 */
export function CanonicalLink() {
  const { pathname } = useLocation();

  useEffect(() => {
    // index.html always ships this tag, but create it if a future template drops it.
    let tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!tag) {
      tag = document.createElement('link');
      tag.rel = 'canonical';
      document.head.appendChild(tag);
    }
    tag.href = canonicalFor(pathname);
  }, [pathname]);

  return null;
}
