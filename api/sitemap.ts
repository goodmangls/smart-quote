/**
 * BridgeLogis — Dynamic sitemap.xml endpoint
 * Path: GET /sitemap.xml  (rewritten to /api/sitemap by vercel.json)
 *
 * Phase 1.5 SEO infrastructure — Phase 1 audit found that requesting
 * /sitemap.xml returned the SPA index.html (HTML), so Google ignored it.
 *
 * Phase 2 hook: when /insights launches, uncomment fetchInsightsUrls()
 * to merge daily-brief / topic / archive URLs into the same sitemap.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE = 'https://bridgelogis.com';

interface UrlEntry {
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  lastmod?: string;
  hreflang?: Record<string, string>;
}

// Only publicly reachable pages belong here.
//
// /quote was listed at priority 0.9 but sits behind ProtectedRoute: an
// unauthenticated crawler is redirected to /login (verified against production
// 2026-08-26). Asking Google to index a URL that answers with a login form
// spends crawl budget and puts a dead entry in the index.
//
// `lastmod` is deliberately omitted. It used to default to `new Date()`, so
// every fetch of this sitemap claimed all pages had changed today — a signal
// Google learns to distrust. Set a real date per entry when a page actually
// changes; no lastmod is better than a false one.
const STATIC_PAGES: UrlEntry[] = [
  { loc: '/',      changefreq: 'weekly',  priority: 1.0 },
  { loc: '/guide', changefreq: 'monthly', priority: 0.6 },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlNode(entry: UrlEntry): string {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(SITE + entry.loc)}</loc>`,
  ];
  // Emitted only when an entry carries a real date. Stamping "today" on every
  // request made the whole sitemap look freshly edited on every crawl.
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  lines.push(
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
  );
  if (entry.hreflang) {
    Object.entries(entry.hreflang).forEach(([lang, href]) => {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}" />`,
      );
    });
  }
  lines.push('  </url>');
  return lines.join('\n');
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Phase 2 hook — uncomment when /insights ships:
    // const insightsUrls = await fetchInsightsUrls();
    const insightsUrls: UrlEntry[] = [];

    const allEntries: UrlEntry[] = [...STATIC_PAGES, ...insightsUrls];

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
      '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
      allEntries.map((e) => buildUrlNode(e)).join('\n') +
      '\n</urlset>\n';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex'); // sitemap itself shouldn't be indexed
    return res.status(200).send(xml);
  } catch {
    // Fail soft — minimum valid sitemap rather than 500
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc></url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(fallback);
  }
}
