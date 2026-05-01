import type { ReactNode } from 'react';

export type DisclaimerVariant = 'general' | 'legal' | 'financial' | 'safety';

interface DisclaimerProps {
  /**
   * 면책 종류. 본문 키워드와 함께 12-point 검증의 disclaimer 항목을 통과시키기 위한 핵심 단서.
   * - general: 일반 정보 면책 (기본값)
   * - legal: 법률·관세 자문 면책
   * - financial: 운임·보험료 등 금액 안내 면책
   * - safety: 위험물·항공 안전 면책
   */
  variant?: DisclaimerVariant;
  /**
   * 컴포넌트 표시 언어. 'ko' 한국어, 'en' 영어.
   */
  lang?: 'ko' | 'en';
  /**
   * 사용자 정의 추가 면책. 배열로 제공하면 기본 텍스트 뒤에 줄바꿈으로 이어 붙임.
   */
  extra?: ReadonlyArray<string>;
  /**
   * 발행/검수 일자 (YYYY-MM-DD 또는 ISO 8601). 인쇄 시점 표기에 사용.
   */
  reviewedAt?: string;
  /**
   * 추가 노드. 자식 요소가 있을 경우 본문 아래에 배치.
   */
  children?: ReactNode;
}

interface DisclaimerCopy {
  heading: string;
  body: string;
  aiNotice: string;
  reviewedLabel: string;
}

const COPY_KO: Record<DisclaimerVariant, DisclaimerCopy> = {
  general: {
    heading: '안내',
    body: '본 콘텐츠는 BridgeLogis(Goodman GLS / J-Ways)가 일반 정보 제공 목적으로 작성한 자료이며, 발행 시점 기준 자료를 토대로 합니다. 운임·환율·관세·요율은 실시간 변동 가능합니다.',
    aiNotice: '본 콘텐츠는 일부 AI 도구를 활용해 작성된 뒤 운영팀이 검수했습니다.',
    reviewedLabel: '검수일',
  },
  legal: {
    heading: '법률·관세 면책',
    body: '본 콘텐츠는 법률 자문이 아니며, 관세·통관·인코텀즈 적용에 대한 법적 결정은 자격을 갖춘 변호사·관세사와의 상담을 통해 이루어져야 합니다. BridgeLogis는 정보의 정확성·완전성을 보장하지 않습니다.',
    aiNotice: '본 콘텐츠는 일부 AI 도구를 활용해 작성된 뒤 운영팀이 검수했습니다.',
    reviewedLabel: '검수일',
  },
  financial: {
    heading: '금액·운임 면책',
    body: '본문에 표시된 운임·FSC·환율·관세 추정치는 발행 시점의 일반 시장 가격을 참고용으로 제공하며, 실제 견적은 화주의 화물 사양·노선·시점·계약 조건에 따라 달라질 수 있습니다.',
    aiNotice: '본 콘텐츠는 일부 AI 도구를 활용해 작성된 뒤 운영팀이 검수했습니다.',
    reviewedLabel: '검수일',
  },
  safety: {
    heading: '항공 안전·위험물 면책',
    body: '본 콘텐츠는 IATA DGR/ICAO TI 일반 안내이며, 실제 위험물 신고·포장·운송에는 항공사·관할 당국이 요구하는 최신 규정과 자격자 검토가 필수입니다. 본문 정보만으로 안전 의사결정을 내리지 마십시오.',
    aiNotice: '본 콘텐츠는 일부 AI 도구를 활용해 작성된 뒤 운영팀이 검수했습니다.',
    reviewedLabel: '검수일',
  },
} as const;

const COPY_EN: Record<DisclaimerVariant, DisclaimerCopy> = {
  general: {
    heading: 'Notice',
    body: 'This article is published by BridgeLogis (Goodman GLS / J-Ways) for general information purposes based on data available at publication time. Rates, FX, duties, and surcharges may change in real time.',
    aiNotice: 'This content was drafted with the assistance of AI tools and reviewed by the BridgeLogis operations team.',
    reviewedLabel: 'Reviewed',
  },
  legal: {
    heading: 'Legal & Customs Disclaimer',
    body: 'This article does not constitute legal advice. Decisions on customs classification, Incoterms, or compliance should be made with qualified attorneys and licensed customs brokers. BridgeLogis makes no warranty as to accuracy or completeness.',
    aiNotice: 'This content was drafted with the assistance of AI tools and reviewed by the BridgeLogis operations team.',
    reviewedLabel: 'Reviewed',
  },
  financial: {
    heading: 'Pricing & Rate Disclaimer',
    body: 'Rates, FSC, FX, and duty estimates shown reflect typical market values at publication time and are for reference only. Actual quotations vary by cargo profile, lane, timing, and contract terms.',
    aiNotice: 'This content was drafted with the assistance of AI tools and reviewed by the BridgeLogis operations team.',
    reviewedLabel: 'Reviewed',
  },
  safety: {
    heading: 'Aviation Safety & Dangerous Goods Disclaimer',
    body: 'This article provides general guidance on IATA DGR / ICAO TI. Actual DG declaration, packaging, and shipping require the latest carrier and regulatory rules and review by qualified personnel. Do not make safety decisions based solely on this content.',
    aiNotice: 'This content was drafted with the assistance of AI tools and reviewed by the BridgeLogis operations team.',
    reviewedLabel: 'Reviewed',
  },
} as const;

export function Disclaimer({
  variant = 'general',
  lang = 'ko',
  extra,
  reviewedAt,
  children,
}: DisclaimerProps) {
  const copy = lang === 'en' ? COPY_EN[variant] : COPY_KO[variant];

  return (
    <aside
      role='note'
      aria-labelledby={`disclaimer-${variant}-heading`}
      data-disclaimer-variant={variant}
      data-lang={lang}
      style={{
        marginTop: '2rem',
        padding: '1.25rem 1.5rem',
        borderLeft: '3px solid #94a3b8',
        background: '#f8fafc',
        borderRadius: '0 6px 6px 0',
        fontSize: '0.875rem',
        lineHeight: 1.6,
        color: '#334155',
      }}
    >
      <h3
        id={`disclaimer-${variant}-heading`}
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          margin: '0 0 0.5rem 0',
          color: '#0b1e3f',
        }}
      >
        {copy.heading}
      </h3>
      <p style={{ margin: '0 0 0.5rem 0' }}>{copy.body}</p>
      {extra && extra.length > 0 ? (
        <ul style={{ margin: '0.5rem 0 0.5rem 1.25rem', padding: 0 }}>
          {extra.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : null}
      <p
        style={{
          margin: '0.5rem 0 0 0',
          fontSize: '0.8125rem',
          color: '#64748b',
          fontStyle: 'italic',
        }}
      >
        {copy.aiNotice}
      </p>
      {reviewedAt ? (
        <p
          style={{
            margin: '0.25rem 0 0 0',
            fontSize: '0.8125rem',
            color: '#64748b',
          }}
        >
          {copy.reviewedLabel}: <time dateTime={reviewedAt}>{reviewedAt}</time>
        </p>
      ) : null}
      {children ? <div style={{ marginTop: '0.5rem' }}>{children}</div> : null}
    </aside>
  );
}

export default Disclaimer;
