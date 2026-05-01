#!/usr/bin/env node
/**
 * BridgeLogis Insights — Pillar publication-ready validator
 *
 * Validates each Pillar MDX against:
 *   • SEO 12-point checklist (pillar-content-list.md §4.2)
 *   • 3 disclaimer types (editorial-policy.md §3)
 *   • Frontmatter completeness for JSON-LD generation
 *
 * Usage:
 *   npm run pillar:validate
 *   npm run pillar:validate -- --json
 *   npm run pillar:validate -- --strict      # exit 1 on any failure
 *   npm run pillar:validate -- --path=output/phase3/pillars
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isStrict = args.includes('--strict');
const pathArg = args.find((a) => a.startsWith('--path='));
const PILLAR_DIR = pathArg ? pathArg.slice(7) : 'output/phase3/pillars';

// ANSI helpers
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

const log = (s = '') => { if (!isJson) process.stdout.write(`${s}\n`); };
const colour = (s, c) => (isJson ? s : `${c}${s}${RESET}`);

// Required disclaimer phrases (KO/EN per editorial-policy.md §3.1~3.3)
const DISCLAIMERS = {
  ko: {
    rates: ['실제 운임은', '인코텀즈', '계약 조건', 'BridgeLogis 운임 계산기'],
    legal: ['법률·세무·관세 자문이 아닙니다', '관세사·세무사', '책임지지 않습니다'],
    forecast: ['미래', '예측', '시장 상황', '의사결정 시 최신'],
  },
  en: {
    rates: ['actual rate', 'BridgeLogis', 'real', 'incoterm'],
    legal: ['not legal', 'tax', 'customs advice', 'qualified', 'bear no responsibility'],
    forecast: ['as of the publication date', 'future', 'predictions', 'rapidly'],
  },
};

// Allowed topics (must match colors.ts TOPIC_LABELS keys)
const ALLOWED_TOPICS = new Set([
  'air-cargo', 'ocean-freight', 'fsc-trends', 'dg', 'cold-chain',
  'e-commerce', 'gssa', 'korea-market', 'carrier-news', 'customs-trade',
]);

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const lines = m[1].split('\n');
  const fm = {};
  let currentKey = null;
  for (const line of lines) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9]*):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      const value = kv[2].trim();
      if (value === '') {
        fm[currentKey] = '';
        continue;
      }
      // strip surrounding quotes
      fm[currentKey] = value.replace(/^["']|["']$/g, '');
    } else if (line.trim().startsWith('-') && currentKey) {
      // YAML list item — collect into array
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(line.trim().slice(1).trim());
    }
  }
  return { frontmatter: fm, body: raw.slice(m[0].length) };
}

function hasAll(haystack, needles) {
  // Case-insensitive: lowercases both sides so 'future' matches 'Future' and 'FUTURE'.
  const lc = haystack.toLowerCase();
  return needles.every((n) => lc.includes(n.toLowerCase()));
}

function check(name, ok, detail = '') {
  return { name, ok, detail };
}

function validatePillar(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    return {
      file: basename(filepath),
      checks: [check('Frontmatter present', false, 'missing --- block')],
    };
  }
  const { frontmatter: fm, body } = parsed;
  const lang = fm.inLanguage?.startsWith('en') ? 'en' : 'ko';

  const checks = [];

  // ── 1. Frontmatter completeness ──
  const required = ['slug', 'date', 'title', 'summary', 'topic', 'tags',
                    'publishedAt', 'readMinutes', 'pillar', 'inLanguage'];
  const missing = required.filter((k) => fm[k] === undefined || fm[k] === '');
  checks.push(check(
    '01. Frontmatter complete',
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : '',
  ));

  // ── 2. Topic in allowed list ──
  checks.push(check(
    '02. Topic ∈ allowed 10',
    ALLOWED_TOPICS.has(fm.topic),
    ALLOWED_TOPICS.has(fm.topic) ? '' : `topic '${fm.topic}' not allowed`,
  ));

  // ── 3. Meta title length ──
  const titleLen = (fm.title ?? '').length;
  const titleLimit = lang === 'ko' ? 80 : 100;
  checks.push(check(
    `03. Meta title ≤ ${titleLimit} chars`,
    titleLen <= titleLimit,
    `${titleLen} chars`,
  ));

  // ── 4. Meta description length ──
  const sumLen = (fm.summary ?? '').length;
  checks.push(check(
    '04. Meta summary 50~200 chars',
    sumLen >= 50 && sumLen <= 200,
    `${sumLen} chars`,
  ));

  // ── 5. H2 count >= 7 ──
  const h2Matches = body.match(/^## /gm) ?? [];
  checks.push(check(
    '05. H2 sections ≥ 7',
    h2Matches.length >= 7,
    `${h2Matches.length} H2`,
  ));

  // ── 6. Internal links to /quote, /insights, /guide ──
  const internalLinks = [
    ...body.matchAll(/\]\((\/quote[^)]*|\/insights[^)]*|\/guide[^)]*|\/dashboard[^)]*)\)/g),
  ];
  checks.push(check(
    '06. Internal links ≥ 6',
    internalLinks.length >= 6,
    `${internalLinks.length} found`,
  ));

  // ── 7. External authority links (https://) ──
  const externalLinks = [
    ...body.matchAll(/\]\((https:\/\/(?!bridgelogis\.com)[^)]+)\)/g),
  ];
  // Also count plain text references to known authorities
  const authorityMentions = [
    /IATA/i, /ICC/i, /IIAC|인천공항공사/, /UPS/i, /DHL/i, /FedEx/i,
    /TAC|Drewry|Xeneta/, /EIA/, /CASS/, /Goodman GLS/i,
  ].filter((re) => re.test(body)).length;
  checks.push(check(
    '07. Authority refs ≥ 3',
    externalLinks.length + authorityMentions >= 3,
    `${externalLinks.length} links + ${authorityMentions} authority mentions`,
  ));

  // ── 8. Disclaimer 1: Rates ──
  const hasRatesDisclaimer = hasAll(body, DISCLAIMERS[lang].rates);
  checks.push(check(
    '08. 면책 #1 운임 정확성',
    hasRatesDisclaimer,
    hasRatesDisclaimer ? '' : `missing keywords: ${DISCLAIMERS[lang].rates.filter((n) => !body.includes(n)).join(', ')}`,
  ));

  // ── 9. Disclaimer 2: Legal/tax/customs ──
  const hasLegalDisclaimer = hasAll(body, DISCLAIMERS[lang].legal);
  checks.push(check(
    '09. 면책 #2 법령·세무·관세',
    hasLegalDisclaimer,
    hasLegalDisclaimer ? '' : `missing keywords: ${DISCLAIMERS[lang].legal.filter((n) => !body.includes(n)).join(', ')}`,
  ));

  // ── 10. Disclaimer 3: Future/forecast (only if topic involves prediction) ──
  const forecastTopics = new Set(['korea-market', 'carrier-news', 'fsc-trends']);
  const needsForecastDisclaimer = forecastTopics.has(fm.topic);
  if (needsForecastDisclaimer) {
    const hasForecastDisclaimer = hasAll(body, DISCLAIMERS[lang].forecast);
    checks.push(check(
      '10. 면책 #3 미래 예측',
      hasForecastDisclaimer,
      hasForecastDisclaimer ? '' : 'forecast disclaimer missing for predictive topic',
    ));
  } else {
    checks.push(check('10. 면책 #3 미래 예측', true, 'N/A — non-predictive topic'));
  }

  // ── 11. AI usage notice ──
  const hasAiNotice = /Claude|AI|인공지능/i.test(body) && /검수|review/i.test(body);
  checks.push(check(
    '11. AI 사용 명시',
    hasAiNotice,
    hasAiNotice ? '' : 'missing "AI ... 검수" footer',
  ));

  // ── 12. Editor email + canonical ready ──
  const hasEditorContact = /editorial@goodmangls\.com/.test(body);
  const hasInLanguage = !!fm.inLanguage;
  checks.push(check(
    '12. Editor 연락처 + canonical 준비',
    hasEditorContact && hasInLanguage,
    `editor:${hasEditorContact} inLanguage:${hasInLanguage}`,
  ));

  // Passing rate
  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const passRate = Math.round((passed / total) * 100);

  return {
    file: basename(filepath),
    lang,
    topic: fm.topic,
    title: fm.title,
    titleLen, sumLen,
    h2Count: h2Matches.length,
    internalLinks: internalLinks.length,
    externalLinks: externalLinks.length,
    authorityMentions,
    checks,
    passed,
    total,
    passRate,
    overall: passed === total ? 'PASS' : passed >= total - 2 ? 'WARN' : 'FAIL',
  };
}

function main() {
  let files;
  try {
    files = readdirSync(PILLAR_DIR)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => join(PILLAR_DIR, f))
      .sort();
  } catch (err) {
    console.error(`Cannot read ${PILLAR_DIR}: ${err.message}`);
    process.exit(2);
  }

  if (files.length === 0) {
    console.error(`No .mdx files in ${PILLAR_DIR}`);
    process.exit(2);
  }

  log(`${BOLD}${CYAN}🔍 BridgeLogis Pillar Validator${RESET}`);
  log(`${DIM}Validating ${files.length} pillars in ${PILLAR_DIR}...${RESET}\n`);

  const results = files.map(validatePillar);

  if (isJson) {
    process.stdout.write(JSON.stringify({ summary: summarize(results), pillars: results }, null, 2) + '\n');
  } else {
    for (const r of results) {
      const overallColour = r.overall === 'PASS' ? GREEN : r.overall === 'WARN' ? YELLOW : RED;
      log(`${BOLD}${r.file}${RESET} ${colour(r.overall, overallColour)} (${r.passed}/${r.total} = ${r.passRate}%) — ${DIM}${r.title?.slice(0, 60) ?? ''}${RESET}`);
      for (const c of r.checks) {
        const icon = c.ok ? colour('✓', GREEN) : colour('✗', RED);
        const detail = c.detail ? ` ${DIM}— ${c.detail}${RESET}` : '';
        log(`  ${icon} ${c.name}${detail}`);
      }
      log('');
    }

    const s = summarize(results);
    log(`${BOLD}Summary:${RESET}`);
    log(`  ${colour(`${s.pass} PASS`, GREEN)} · ${colour(`${s.warn} WARN`, YELLOW)} · ${colour(`${s.fail} FAIL`, RED)} / ${s.total} pillars`);
    log(`  Average pass rate: ${s.avgPassRate}%`);
    log(`  H2 sections: avg ${s.avgH2}, internal links: avg ${s.avgInternalLinks}`);
  }

  if (isStrict && summarize(results).fail > 0) process.exit(1);
}

function summarize(results) {
  const total = results.length;
  return {
    total,
    pass: results.filter((r) => r.overall === 'PASS').length,
    warn: results.filter((r) => r.overall === 'WARN').length,
    fail: results.filter((r) => r.overall === 'FAIL').length,
    avgPassRate: Math.round(results.reduce((a, r) => a + r.passRate, 0) / total),
    avgH2: Math.round(results.reduce((a, r) => a + r.h2Count, 0) / total),
    avgInternalLinks: Math.round(results.reduce((a, r) => a + r.internalLinks, 0) / total),
  };
}

main();
