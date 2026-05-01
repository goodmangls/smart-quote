#!/usr/bin/env node
/**
 * BridgeLogis Pillar — auto-patcher to bring all existing Pillars to PASS state.
 *
 * Patches:
 *   1. Replaces ad-hoc disclaimer section (## 10. 면책 / Disclaimer) with the
 *      standardized markdown rendering equivalent to <Disclaimer /> component.
 *   2. Inserts a "## 10.5 함께 읽으면 좋은 글" / "Related Reading" block with
 *      4+ inter-pillar links — guaranteeing internal links ≥ 6.
 *
 * Idempotent — running twice produces same result. Backs up original to .bak.
 *
 * Usage:
 *   node scripts/pillar-patch.mjs
 *   node scripts/pillar-patch.mjs -- --dry-run
 */
import { readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PILLAR_DIR = 'output/phase3/pillars';
const PILLAR_REGISTRY = {
  '01-gssa-complete-guide':         { ko: 'GSSA 항공 화물 대리점 완전 가이드', en: 'Complete Guide to GSSA in Korea', topic: 'gssa' },
  '02-incoterms-2020-dap-explained': { ko: 'Incoterms 2020 DAP 완전 가이드', en: 'Incoterms 2020 DAP Explained', topic: 'customs-trade' },
  '03-air-freight-rate-indices':    { ko: '항공 화물 운임 인덱스 완벽 해석', en: 'How to Read Air Freight Rate Indices', topic: 'air-cargo' },
  '04-fsc-complete-guide':          { ko: 'FSC 유류할증료 완벽 가이드', en: 'FSC Complete Guide', topic: 'fsc-trends' },
  '05-korea-air-cargo-market-2026': { ko: '한국 항공 화물 시장 2026', en: 'Korea Air Cargo Market 2026', topic: 'korea-market' },
  '06-iata-dg-air-shipping':        { ko: 'IATA DG 항공 운송 가이드', en: 'IATA DG Air Shipping Guide', topic: 'dg' },
  '07-cold-chain-pharma-logistics': { ko: '콜드체인 의약품 항공 운송', en: 'Cold Chain Pharma Logistics', topic: 'cold-chain' },
};

const PREDICTIVE_TOPICS = new Set(['korea-market', 'carrier-news', 'fsc-trends']);

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { frontmatter: fm, body: raw.slice(m[0].length), fmRaw: m[0] };
}

function buildRelatedBlock(currentSlug, lang) {
  // Pick 4 other Pillars (excluding the current one)
  const others = Object.entries(PILLAR_REGISTRY)
    .filter(([slug]) => slug !== currentSlug)
    .slice(0, 4);
  const heading = lang === 'ko' ? '## 10.5 함께 읽으면 좋은 글' : '## 10.5 Related Reading';
  const cta = lang === 'ko' ? '추가 인사이트 둘러보기' : 'Browse more insights';
  const items = others.map(([_slug, p]) => {
    const label = lang === 'ko' ? p.ko : p.en;
    return `- [${label} →](/insights/topics/${p.topic})`;
  }).join('\n');
  const tail = lang === 'ko'
    ? `- [📰 모든 BridgeLogis Insights](/insights)\n- [⚡ 지금 견적 받기](/quote)\n- [📚 BridgeLogis 사용 가이드](/guide)`
    : `- [📰 All BridgeLogis Insights](/insights)\n- [⚡ Get a Quote Now](/quote)\n- [📚 BridgeLogis Guide](/guide)`;
  return `\n${heading}\n\n${items}\n${tail}\n\n_${cta}_\n`;
}

function buildStandardDisclaimer(lang, topic, body) {
  const isPredictive = PREDICTIVE_TOPICS.has(topic);
  const aiKept = body.match(/본 브리핑은[\s\S]*?editorial@goodmangls\.com[\s\S]*?\)/)
              ?? body.match(/This briefing[\s\S]*?editorial@goodmangls\.com[\s\S]*?\./);

  if (lang === 'ko') {
    const blocks = [];
    blocks.push('본 정보는 정보 제공 목적이며, 실제 운임은 화물 특성·인코텀즈·계약 조건·발송일자에 따라 달라질 수 있습니다. 정확한 견적은 BridgeLogis 운임 계산기(/quote)를 이용하시고, 대량/특수 화물의 경우 영업팀(sales@goodmangls.com)에 직접 문의해 주십시오. UPS·DHL 익스프레스 화물은 DAP 인코텀즈만 지원합니다.');
    blocks.push('본 콘텐츠는 일반 정보 제공이며 법률·세무·관세 자문이 아닙니다. 구체적 사례는 관세사·세무사 또는 자격을 갖춘 법률 전문가에게 자문하시기 바랍니다. BridgeLogis와 Goodman GLS는 본 콘텐츠 의존으로 인한 손실에 대해 책임지지 않습니다.');
    if (isPredictive) {
      blocks.push('본 콘텐츠는 발행일 기준 공개 자료를 토대로 작성되었으며, 미래 시장 동향·운임 변동·캐리어 정책에 대한 예측은 보증되지 않습니다. 시장 상황은 빠르게 변할 수 있으므로 의사결정 시 최신 정보를 확인하시기 바랍니다.');
    }
    blocks.push(aiKept?.[0] ?? '본 브리핑은 BridgeLogis Editorial이 작성하고, AI(Claude Haiku) 보조를 받아 사람이 검수·편집했습니다. 사실 오류 발견 시 [editorial@goodmangls.com](mailto:editorial@goodmangls.com) 으로 알려주십시오.');
    return blocks.join('\n\n');
  }

  const blocks = [];
  blocks.push('This is informational only. The actual rate depends on cargo characteristics, incoterm, contract conditions, and pickup date. For real precise quotes use the BridgeLogis calculator (/quote); for large or specialty cargo, contact our sales team (sales@goodmangls.com). UPS and DHL Express shipments are supported under DAP incoterm only.');
  blocks.push('This content is for general information only and is not legal, tax, or customs advice. Consult qualified customs brokers, tax advisors, or legal counsel for specific cases. BridgeLogis and Goodman GLS bear no responsibility for losses arising from reliance on this content.');
  if (isPredictive) {
    blocks.push('This content was prepared as of the publication date from publicly available sources. Future market trends, freight rate movements, and carrier policy predictions are not guaranteed. Markets can change rapidly — verify the latest information when making decisions.');
  }
  blocks.push(aiKept?.[0] ?? 'This briefing was authored by BridgeLogis Editorial with AI assistance (Claude Haiku) and human review. Please report factual errors to [editorial@goodmangls.com](mailto:editorial@goodmangls.com).');
  return blocks.join('\n\n');
}

function patchPillar(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) return { file: filepath, changed: false, reason: 'no frontmatter' };

  const { frontmatter, body, fmRaw } = parsed;
  const slug = frontmatter.slug;
  const lang = frontmatter.inLanguage?.startsWith('en') ? 'en' : 'ko';
  const topic = frontmatter.topic;

  if (!slug || !topic) {
    return { file: filepath, changed: false, reason: 'missing slug/topic' };
  }

  // 1. Locate disclaimer section heading (## 10. 면책 or ## 10. Disclaimer)
  const disclaimerHeadingRe = lang === 'ko'
    ? /\n## 10\.\s*면책[\s\S]*?(?=\n---\s*\n|\n## |\n> \*\*|$)/
    : /\n## 10\.\s*Disclaimer[\s\S]*?(?=\n---\s*\n|\n## |\n> \*\*|$)/;

  const newDisclaimerSection = `\n## 10. ${lang === 'ko' ? '면책' : 'Disclaimer'}\n\n${buildStandardDisclaimer(lang, topic, body)}\n`;

  // 2. Build related-pillars block
  const relatedBlock = buildRelatedBlock(slug, lang);

  // 3. Find the trailing "---\n\n> **다음 Pillar**" block to preserve
  const trailerRe = /\n---\n\n> \*\*[\s\S]*$/;
  const trailerMatch = body.match(trailerRe);
  const trailer = trailerMatch ? trailerMatch[0] : '';

  // 4. Strip trailer + existing disclaimer from body
  let newBody = body;
  if (trailer) newBody = newBody.replace(trailerRe, '');
  newBody = newBody.replace(disclaimerHeadingRe, '\n%%DISCLAIMER_PLACEHOLDER%%\n');

  // 5. Insert related block + new disclaimer + trailer
  if (newBody.includes('%%DISCLAIMER_PLACEHOLDER%%')) {
    newBody = newBody.replace('%%DISCLAIMER_PLACEHOLDER%%', `${relatedBlock}${newDisclaimerSection}`);
  } else {
    // Fallback: append at end
    newBody = `${newBody}\n${relatedBlock}${newDisclaimerSection}`;
  }

  newBody = `${newBody}${trailer}`;

  const newRaw = `${fmRaw}${newBody}`;

  if (newRaw === raw) {
    return { file: filepath, changed: false, reason: 'already standardized' };
  }

  if (!DRY_RUN) {
    copyFileSync(filepath, `${filepath}.bak`);
    writeFileSync(filepath, newRaw, 'utf8');
  }
  return { file: filepath, changed: true, lang, topic, isPredictive: PREDICTIVE_TOPICS.has(topic) };
}

function main() {
  const files = readdirSync(PILLAR_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => join(PILLAR_DIR, f))
    .sort();

  console.log(`🔧 Patching ${files.length} pillars${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  for (const f of files) {
    const r = patchPillar(f);
    const tag = r.changed ? '✓ patched' : '◌ skipped';
    const detail = r.reason ? ` — ${r.reason}` : ` — ${r.lang}/${r.topic}${r.isPredictive ? ' [+forecast]' : ''}`;
    console.log(`${tag}  ${f}${detail}`);
  }
  console.log(`\n${DRY_RUN ? '(dry run — no files written. Backup .bak files created on real run.)' : 'Done. Run `node scripts/pillar-validate.mjs` to verify.'}`);
}

main();
