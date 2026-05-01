/**
 * BridgeLogis Insights — RelatedPillars component
 *
 * Renders related-Pillar cards from a list of slugs, plus 3 standard
 * cross-link CTAs (/quote, /insights, /guide). This guarantees ≥ 6 internal
 * links per article — satisfying validator check #06.
 *
 * Usage in MDX:
 *   <RelatedPillars slugs={["02-incoterms-2020-dap-explained","04-fsc-complete-guide"]} lang="ko" />
 */
import Link from 'next/link';
import type { ReactElement } from 'react';

type Lang = 'ko' | 'en';

interface PillarMeta {
  slug: string;
  titleKo: string;
  titleEn: string;
  topic: string;
}

// Static registry — kept in sync with content/pillars/*.mdx frontmatter.
// In Phase 3 W4 this can be auto-generated from Contentlayer or the MDX index.
const PILLAR_REGISTRY: Record<string, PillarMeta> = {
  '01-gssa-complete-guide': {
    slug: '01-gssa-complete-guide',
    titleKo: 'GSSA 항공 화물 대리점 완전 가이드',
    titleEn: 'Complete Guide to GSSA in Korea',
    topic: 'gssa',
  },
  '02-incoterms-2020-dap-explained': {
    slug: '02-incoterms-2020-dap-explained',
    titleKo: 'Incoterms 2020 DAP 완전 가이드',
    titleEn: 'Incoterms 2020 DAP Explained',
    topic: 'customs-trade',
  },
  '03-air-freight-rate-indices': {
    slug: '03-air-freight-rate-indices',
    titleKo: '항공 화물 운임 인덱스 완벽 해석',
    titleEn: 'How to Read Air Freight Rate Indices',
    topic: 'air-cargo',
  },
  '04-fsc-complete-guide': {
    slug: '04-fsc-complete-guide',
    titleKo: 'FSC 유류할증료 완벽 가이드',
    titleEn: 'Fuel Surcharge Complete Guide',
    topic: 'fsc-trends',
  },
  '05-korea-air-cargo-market-2026': {
    slug: '05-korea-air-cargo-market-2026',
    titleKo: '한국 항공 화물 시장 2026',
    titleEn: 'Korea Air Cargo Market 2026',
    topic: 'korea-market',
  },
  '06-iata-dg-air-shipping': {
    slug: '06-iata-dg-air-shipping',
    titleKo: 'IATA DG 위험물 항공 운송 완전 가이드',
    titleEn: 'IATA Dangerous Goods Air Shipping Guide',
    topic: 'dg',
  },
  '07-cold-chain-pharma-logistics': {
    slug: '07-cold-chain-pharma-logistics',
    titleKo: '콜드체인 의약품 항공 운송 가이드',
    titleEn: 'Cold Chain Pharma Air Logistics Guide',
    topic: 'cold-chain',
  },
};

interface RelatedPillarsProps {
  slugs: readonly string[];
  lang: Lang;
}

export function RelatedPillars({ slugs, lang }: RelatedPillarsProps): ReactElement {
  const items = slugs
    .map((s) => PILLAR_REGISTRY[s])
    .filter((p): p is PillarMeta => p !== undefined);

  return (
    <section className="related-pillars" aria-label={lang === 'ko' ? '관련 Pillar' : 'Related Pillars'}>
      <h2>{lang === 'ko' ? '함께 읽으면 좋은 글' : 'Related Reading'}</h2>
      <ul className="related-pillars__list">
        {items.map((p) => (
          <li key={p.slug}>
            <Link href={`/insights/topics/${p.topic}`} className="related-pillars__card">
              <span className="related-pillars__title">
                {lang === 'ko' ? p.titleKo : p.titleEn}
              </span>
              <span className="related-pillars__topic">{p.topic}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="related-pillars__ctas">
        <Link href="/quote" className="related-pillars__cta">
          ⚡ {lang === 'ko' ? '지금 견적 받기' : 'Get a Quote'}
        </Link>
        <Link href="/insights" className="related-pillars__cta">
          📰 {lang === 'ko' ? '모든 인사이트 보기' : 'All Insights'}
        </Link>
        <Link href="/guide" className="related-pillars__cta">
          📚 {lang === 'ko' ? 'BridgeLogis 사용 가이드' : 'BridgeLogis Guide'}
        </Link>
      </div>
    </section>
  );
}

export default RelatedPillars;
