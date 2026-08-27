/**
 * Build-time prerender for the two public routes.
 *
 * Why: the app is a client-rendered SPA, so the HTML every crawler receives is
 * `<div id="root"></div>` — zero visible text. Verified 2026-08-27:
 * `site:bridgelogis.com` on Naver returns "검색결과가 없습니다", and AI crawlers
 * that do not execute JavaScript see nothing at all, despite robots.txt
 * explicitly inviting them.
 *
 * ⚠️ Deliberately NOT rendering <App/>. LandingPage and UserGuidePage are
 * `React.lazy` there, and `renderToString` does not resolve lazy boundaries —
 * it emits the <Suspense> fallback, i.e. the loading spinner. That would
 * produce valid, non-empty HTML containing no content, and every gate (tsc,
 * lint, vitest, build, the SEO CI checks) would still pass. So the pages are
 * imported statically here and rendered without the router/auth shell.
 *
 * ⚠️ The app mounts with `createRoot`, not `hydrateRoot`, so React discards
 * this markup and re-renders on mount. That is intentional: no hydration
 * mismatch is possible, and the snapshot exists purely so crawlers (and the
 * first paint) have real content.
 */
import { renderToString } from 'react-dom/server';
// react-router-dom 7 exports StaticRouter from the main entry; the old
// `react-router-dom/server` subpath no longer resolves.
import { StaticRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LandingPage } from '../src/pages/LandingPage';
import UserGuidePage from '../src/pages/UserGuidePage';
import { canonicalFor } from '../src/lib/canonical';

interface Target {
  route: string;
  /** File written under dist/. Vercel serves /guide from guide.html. */
  outFile: string;
  element: React.ReactElement;
  /** A phrase that must appear in the output. If it does not, the render
   *  silently produced a shell and the build must fail. */
  expect: string;
}

const TARGETS: Target[] = [
  { route: '/', outFile: 'index.html', element: <LandingPage />, expect: 'Global Freight Networks' },
  { route: '/guide', outFile: 'guide.html', element: <UserGuidePage />, expect: 'User Guide' },
];

function renderRoute(target: Target): string {
  return renderToString(
    <StaticRouter location={target.route}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>{target.element}</AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </StaticRouter>,
  );
}

function main() {
  const dist = path.resolve(process.cwd(), 'dist');
  const templatePath = path.join(dist, 'index.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  if (!template.includes('<div id="root"></div>')) {
    throw new Error('prerender: dist/index.html no longer contains the empty root div');
  }

  for (const target of TARGETS) {
    const html = renderRoute(target);

    // The whole point of this step. An empty or fallback-only render must stop
    // the build rather than ship a shell that looks fine to every other check.
    if (!html.includes(target.expect)) {
      throw new Error(
        `prerender: ${target.route} rendered without "${target.expect}" ` +
          `(${html.length} bytes). Did the page become React.lazy again?`,
      );
    }

    const page = template
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${canonicalFor(target.route)}" />`,
      );

    fs.writeFileSync(path.join(dist, target.outFile), page, 'utf-8');
    console.log(`prerender: ${target.route} → dist/${target.outFile} (+${html.length} bytes)`);
  }
}

main();
