#!/usr/bin/env node
/**
 * BridgeLogis — SEO Audit script
 *
 * Usage:
 *   npm run seo:audit                 # Audit live production
 *   npm run seo:audit -- --baseline   # Save current scores as baseline
 *   npm run seo:audit -- --compare    # Compare current vs baseline
 *   npm run seo:audit -- --url=https://preview.vercel.app   # Custom URL
 *
 * What it does:
 *   1) Runs Lighthouse on production (or preview) URL × 3 runs (median used)
 *   2) Computes 5 category scores (perf / a11y / bp / seo / pwa)
 *   3) Validates robots.txt + sitemap.xml + JSON-LD structured data
 *   4) Stores result in .lighthouseci/ as baseline OR compares with baseline
 *   5) Prints a colored summary table
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const URL_ARG = args.find((a) => a.startsWith('--url='));
const SITE_URL = URL_ARG ? URL_ARG.slice(6) : 'https://bridgelogis.com';
const IS_BASELINE = args.includes('--baseline');
const IS_COMPARE = args.includes('--compare');
const SUMMARY_DIR = '.lighthouseci';
const BASELINE_PATH = join(SUMMARY_DIR, 'baseline.json');

const RESET = '\x1b[0m'; const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m'; const YELLOW = '\x1b[33m';
const RED = '\x1b[31m'; const CYAN = '\x1b[36m';

function log(msg, color = RESET) { process.stdout.write(`${color}${msg}${RESET}\n`); }
function step(n, msg) { log(`\n${CYAN}${BOLD}[${n}] ${msg}${RESET}`); }

// ─── 1. Run Lighthouse ─────────────────────────────────────────────
step(1, `Running Lighthouse against ${SITE_URL}...`);
if (!existsSync(SUMMARY_DIR)) mkdirSync(SUMMARY_DIR, { recursive: true });

try {
  execSync(
    `npx lhci collect ` +
    `--url=${SITE_URL}/ ` +
    `--url=${SITE_URL}/quote ` +
    `--url=${SITE_URL}/guide ` +
    `--numberOfRuns=3 ` +
    `--settings.preset=desktop ` +
    `--settings.chromeFlags="--no-sandbox --headless"`,
    { stdio: 'inherit' },
  );
} catch (err) {
  log(`Lighthouse collection failed: ${err.message}`, RED);
  process.exit(1);
}

// ─── 2. Aggregate scores ──────────────────────────────────────────
step(2, 'Aggregating category scores...');
const reports = readdirSync(SUMMARY_DIR)
  .filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(SUMMARY_DIR, f), 'utf8')));

if (reports.length === 0) {
  log('No reports generated', RED);
  process.exit(1);
}

// Group by URL
const byUrl = {};
reports.forEach((r) => {
  const url = r.finalUrl || r.requestedUrl;
  if (!byUrl[url]) byUrl[url] = [];
  byUrl[url].push(r);
});

const summary = {};
Object.entries(byUrl).forEach(([url, runs]) => {
  const median = (key) => {
    const vals = runs.map((r) => r.categories?.[key]?.score ?? 0).filter((n) => n > 0);
    if (vals.length === 0) return 0;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  };
  summary[url] = {
    performance:    Math.round(median('performance')    * 100),
    accessibility:  Math.round(median('accessibility')  * 100),
    bestPractices:  Math.round(median('best-practices') * 100),
    seo:            Math.round(median('seo')            * 100),
    pwa:            Math.round(median('pwa')            * 100),
  };
});

// ─── 3. SEO infra checks ─────────────────────────────────────────
step(3, 'Checking SEO infra (robots.txt / sitemap.xml / JSON-LD)...');
async function fetchAndCheck(path, expectedContentType) {
  try {
    const r = await fetch(`${SITE_URL}${path}`, { redirect: 'manual' });
    const ct = r.headers.get('content-type') ?? '';
    const ok = r.status === 200 && ct.includes(expectedContentType);
    return { path, status: r.status, contentType: ct, ok };
  } catch (err) {
    return { path, status: 0, contentType: '', ok: false, error: err.message };
  }
}

const checks = await Promise.all([
  fetchAndCheck('/robots.txt', 'text/plain'),
  fetchAndCheck('/sitemap.xml', 'application/xml'),
]);

// JSON-LD check
let jsonLdCount = 0;
try {
  const html = await (await fetch(SITE_URL)).text();
  jsonLdCount = (html.match(/application\/ld\+json/g) ?? []).length;
} catch { /* ignore */ }
checks.push({ path: 'JSON-LD blocks (root /)', count: jsonLdCount, ok: jsonLdCount >= 2 });

// ─── 4. Store / Compare ─────────────────────────────────────────
const result = { url: SITE_URL, timestamp: new Date().toISOString(), summary, checks };

if (IS_BASELINE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(result, null, 2));
  log(`✅ Baseline saved to ${BASELINE_PATH}`, GREEN);
}

if (IS_COMPARE) {
  if (!existsSync(BASELINE_PATH)) {
    log(`⚠️  No baseline found. Run with --baseline first.`, YELLOW);
    process.exit(1);
  }
  step(4, 'Comparing with baseline...');
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  log(`\n${BOLD}Score Diff (current vs ${baseline.timestamp.slice(0, 10)})${RESET}\n`);
  const headers = ['URL', 'Perf', 'A11y', 'BP', 'SEO', 'PWA'];
  log(headers.map((h) => h.padEnd(40 / headers.length)).join('│'));
  Object.entries(summary).forEach(([url, cur]) => {
    const base = baseline.summary[url] ?? cur;
    const cells = [
      url.replace(SITE_URL, ''),
      diff(base.performance,    cur.performance),
      diff(base.accessibility,  cur.accessibility),
      diff(base.bestPractices,  cur.bestPractices),
      diff(base.seo,            cur.seo),
      diff(base.pwa,            cur.pwa),
    ];
    log(cells.map((c) => String(c).padEnd(40 / headers.length)).join('│'));
  });
}

function diff(before, after) {
  const d = after - before;
  if (d === 0) return `${after} (─)`;
  if (d > 0) return `${GREEN}${after} (+${d})${RESET}`;
  return `${RED}${after} (${d})${RESET}`;
}

// ─── 5. Print summary ────────────────────────────────────────────
step(5, 'Final summary');
log(`\n${BOLD}Lighthouse scores (median of 3 runs)${RESET}\n`);
Object.entries(summary).forEach(([url, s]) => {
  log(`  ${BOLD}${url}${RESET}`);
  Object.entries(s).forEach(([cat, score]) => {
    const color = score >= 90 ? GREEN : score >= 75 ? YELLOW : RED;
    log(`    ${cat.padEnd(15)} ${color}${score}${RESET}`);
  });
});

log(`\n${BOLD}SEO Infra checks${RESET}`);
checks.forEach((c) => {
  const icon = c.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  log(`  ${icon} ${c.path}${c.count !== undefined ? ` — ${c.count} blocks` : ` — ${c.status} ${c.contentType}`}`);
});

const allOk = checks.every((c) => c.ok);
const seoOk = Object.values(summary).every((s) => s.seo >= 90);

if (allOk && seoOk) {
  log(`\n${GREEN}${BOLD}✅ All checks passed — SEO infra healthy.${RESET}`);
  process.exit(0);
} else {
  log(`\n${YELLOW}${BOLD}⚠️  Some checks failed. See above.${RESET}`);
  process.exit(IS_COMPARE ? 0 : 1);
}
