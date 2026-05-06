import Link from 'next/link';

export interface RelatedPillarItem {
  slug: string;
  title: string;
  /** 카테고리 라벨. 예: 'GSSA', 'Incoterms', 'FSC' */
  category?: string;
  /** 짧은 설명. 미제공 시 카드에 본문 영역 생략 */
  description?: string;
  /** 'ko' | 'en' — 다국어 라벨 결정 */
  lang?: 'ko' | 'en';
}

interface RelatedPillarsProps {
  /**
   * 표시할 Pillar 목록. 12-point 검증 통과를 위해 최소 6개 제공이 권장됨.
   * (검증 규칙: 본문 + RelatedPillars 합산 내부 링크 ≥ 6).
   */
  items: ReadonlyArray<RelatedPillarItem>;
  /**
   * 섹션 제목. 미제공 시 lang 에 맞춘 기본값 사용.
   */
  heading?: string;
  /**
   * 'ko' | 'en' — 기본값 'ko'.
   */
  lang?: 'ko' | 'en';
}

const HEADING_DEFAULT = {
  ko: '함께 읽으면 좋은 인사이트',
  en: 'Related Insights',
} as const;

const READ_LABEL = {
  ko: '바로가기',
  en: 'Read',
} as const;

export function RelatedPillars({
  items,
  heading,
  lang = 'ko',
}: RelatedPillarsProps): React.ReactElement | null {
  if (items.length === 0) return null;

  const sectionHeading = heading ?? HEADING_DEFAULT[lang];
  const readLabel = READ_LABEL[lang];

  return (
    <section
      aria-labelledby='related-pillars-heading'
      data-component='RelatedPillars'
      data-lang={lang}
      data-count={items.length}
      style={{
        marginTop: '3rem',
        padding: '1.5rem 1.5rem 2rem 1.5rem',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <h2
        id='related-pillars-heading'
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#0b1e3f',
          margin: '0 0 1.25rem 0',
        }}
      >
        {sectionHeading}
      </h2>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {items.map((item) => (
          <li
            key={item.slug}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '1rem 1.25rem',
              background: '#ffffff',
            }}
          >
            <Link
              href={`/pillars/${item.slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              {item.category ? (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: '#1e40af',
                    background: '#dbeafe',
                    padding: '0.0625rem 0.4375rem',
                    borderRadius: 4,
                    marginBottom: '0.375rem',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.category}
                </span>
              ) : null}
              <h3
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#0b1e3f',
                  margin: '0 0 0.375rem 0',
                  lineHeight: 1.4,
                }}
              >
                {item.title}
              </h3>
              {item.description ? (
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#475569',
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {item.description}
                </p>
              ) : null}
              <span
                aria-hidden='true'
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#1e40af',
                }}
              >
                {readLabel} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default RelatedPillars;
