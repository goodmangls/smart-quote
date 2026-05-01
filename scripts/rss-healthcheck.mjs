#!/usr/bin/env node
/**
 * BridgeLogis Insights — 8 RSS feeds healthcheck
 *
 * Validates the 8 RSS feeds wired up in vite.config.ts logisticsNewsDevProxy()
 * before Phase 3 W4 colour content automation kicks in.
 *
 * Usage:
 *   npm run rss:healthcheck
 *   npm run rss:healthcheck -- --json     # JSON output for CI
 *   npm run rss:healthcheck -- --strict   # exit 1 if any feed fails
 *
 * Checks per feed:
 *   1. HTTP 200 within timeout (default 8s)
 *   2. Content-Type contains xml or rss
 *   3. <rss> or <feed> root element present
 *   4. At least 1 <item> or <entry> element
 *   5. Most recent pubDate within last 7 days (warns if older)
 */
import { performance } from 'node:perf_hooks';

const FEEDS = [
  { url: 'https://www.freightwaves.com/feed',                  source: 'FreightWaves',     lang: 'en' },
  { url: 'https://theloadstar.com/feed',                       source: 'The Loadstar',     lang: 'en' },
  { url: 'https://gcaptain.com/feed',                          source: 'gCaptain',         lang: 'en' },
  { url: 'https://www.aircargonews.net/feed',                  source: 'Air Cargo News',   lang: 'en' },
  { url: 'https://aircargoworld.com/feed',                     source: 'Air Cargo World',  lang: 'en' },
  { url: 'https://www.klnews.co.kr/rss/allArticle.xml',        source: '물류신문',           lang: 'ko' },
  { url: 'https://www.maritimepress.co.kr/rss/allArticle.xml', source: '해양한국',           lang: 'ko' },
  { url: 'https://www.spnews.co.kr/rss/allArticle.xml',        source: '해운항만물류',        lang: 'ko' },
];

const TIMEOUT_MS = 8000;
const STALENESS_DAYS = 7;
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isStrict = args.includes('--strict');

// ANSI colour helpers
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

const colour = (s, c) => (isJson ? s : `${c}${s}${RESET}`);
const log = (s) => { if (!isJson) process.stdout.write(`${s}\n`); };

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BridgeLogis-Insights/1.0 (+ops@goodmangls.com)' },
    });
    return r;
  } finally {
    clearTimeout(tid);
  }
}

function extractMostRecentPubDate(xml) {
  // Try RSS <pubDate> first, fall back to Atom <updated>
  const pubMatches = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)];
  const updMatches = [...xml.matchAll(/<updated>([^<]+)<\/updated>/g)];
  const dates = [...pubMatches, ...updMatches]
    .map((m) => new Date(m[1].trim()))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] ?? null;
}

function countItems(xml) {
  const itemCount = (xml.match(/<item[\s>]/g) ?? []).length;
  const entryCount = (xml.match(/<entry[\s>]/g) ?? []).length;
  return itemCount + entryCount;
}

async function checkFeed(feed) {
  const t0 = performance.now();
  const result = {
    source: feed.source,
    url: feed.url,
    lang: feed.lang,
    status: 'unknown',
    httpStatus: 0,
    contentType: '',
    itemCount: 0,
    mostRecent: null,
    daysSinceLatest: null,
    elapsedMs: 0,
    issues: [],
  };

  try {
    const r = await fetchWithTimeout(feed.url, TIMEOUT_MS);
    result.httpStatus = r.status;
    result.contentType = r.headers.get('content-type') ?? '';

    if (!r.ok) {
      result.issues.push(`HTTP ${r.status}`);
      result.status = 'fail';
      return result;
    }

    const ct = result.contentType.toLowerCase();
    if (!ct.includes('xml') && !ct.includes('rss')) {
      result.issues.push(`unexpected content-type: ${result.contentType}`);
    }

    const xml = await r.text();
    if (!/<rss[\s>]|<feed[\s>]/i.test(xml)) {
      result.issues.push('no <rss> or <feed> root element');
      result.status = 'fail';
      return result;
    }

    result.itemCount = countItems(xml);
    if (result.itemCount === 0) {
      result.issues.push('zero items in feed');
      result.status = 'fail';
      return result;
    }

    const mostRecent = extractMostRecentPubDate(xml);
    result.mostRecent = mostRecent ? mostRecent.toISOString() : null;
    if (mostRecent) {
      const daysSince = (Date.now() - mostRecent.getTime()) / 86400000;
      result.daysSinceLatest = Number(daysSince.toFixed(1));
      if (daysSince > STALENESS_DAYS) {
        result.issues.push(`stale — most recent ${result.daysSinceLatest}d ago`);
        result.status = 'warn';
      } else {
        result.status = 'ok';
      }
    } else {
      result.issues.push('no parseable pubDate');
      result.status = 'warn';
    }
  } catch (err) {
    const msg = err.name === 'AbortError' ? `timeout (>${TIMEOUT_MS}ms)` : String(err.message ?? err);
    result.issues.push(msg);
    result.status = 'fail';
  } finally {
    result.elapsedMs = Number((performance.now() - t0).toFixed(0));
  }
  return result;
}

function statusIcon(status) {
  return status === 'ok' ? colour('✓', GREEN)
    : status === 'warn' ? colour('!', YELLOW)
    : colour('✗', RED);
}

function statusLabel(status) {
  return status === 'ok' ? colour('OK', GREEN)
    : status === 'warn' ? colour('WARN', YELLOW)
    : colour('FAIL', RED);
}

async function main() {
  log(`${BOLD}${CYAN}🔍 BridgeLogis RSS Healthcheck${RESET}`);
  log(`${DIM}Checking ${FEEDS.length} feeds (timeout ${TIMEOUT_MS / 1000}s, stale > ${STALENESS_DAYS}d)...${RESET}\n`);

  const results = await Promise.all(FEEDS.map(checkFeed));

  if (isJson) {
    process.stdout.write(JSON.stringify({ summary: summarize(results), feeds: results }, null, 2) + '\n');
  } else {
    // Pretty table
    log(`${BOLD}${'Source'.padEnd(22)} ${'Status'.padEnd(8)} ${'Items'.padEnd(7)} ${'Latest'.padEnd(12)} ${'Time'.padEnd(8)} Issues${RESET}`);
    log('─'.repeat(80));
    for (const r of results) {
      const items = String(r.itemCount).padEnd(7);
      const latest = (r.daysSinceLatest !== null ? `${r.daysSinceLatest}d` : 'n/a').padEnd(12);
      const time = `${r.elapsedMs}ms`.padEnd(8);
      const issues = r.issues.length ? r.issues.join('; ') : '';
      log(`${statusIcon(r.status)} ${r.source.padEnd(20)} ${statusLabel(r.status).padEnd(8 + 9)} ${items} ${latest} ${time} ${DIM}${issues}${RESET}`);
    }
    log('─'.repeat(80));
    const s = summarize(results);
    log(`\n${BOLD}Summary:${RESET} ${colour(`${s.ok} OK`, GREEN)} · ${colour(`${s.warn} WARN`, YELLOW)} · ${colour(`${s.fail} FAIL`, RED)} · total ${s.total}`);
    log(`Average response: ${s.avgMs}ms · slowest: ${s.slowest.source} (${s.slowest.elapsedMs}ms)`);
  }

  // Exit code
  const s = summarize(results);
  if (isStrict && s.fail > 0) process.exit(1);
  if (!isStrict && s.fail >= Math.ceil(FEEDS.length / 2)) {
    log(`\n${RED}${BOLD}⚠️  More than half feeds failed — Phase 3 content automation at risk.${RESET}`);
    process.exit(1);
  }
}

function summarize(results) {
  return {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    fail: results.filter((r) => r.status === 'fail').length,
    avgMs: Math.round(results.reduce((a, r) => a + r.elapsedMs, 0) / results.length),
    slowest: results.reduce((s, r) => (r.elapsedMs > s.elapsedMs ? r : s), results[0]),
  };
}

main().catch((err) => {
  console.error('Healthcheck failed:', err);
  process.exit(2);
});
