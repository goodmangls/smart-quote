import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '인사이트 인덱스',
  description: '항공 화물·국제 특송·GSSA·인코텀즈·FSC·콜드체인 실무 인사이트',
  alternates: { canonical: '/insights' },
};

interface PillarItem {
  slug: string;
  title: string;
  category: string;
  description: string;
  pubDate: string;
}

// MVP — output/phase3/pillars/ 의 메타에서 추출. 정식 단계에서는 lib/pillars.ts 로 이전.
const PILLARS: ReadonlyArray<PillarItem> = [
  {
    slug: 'gssa-complete-guide',
    title: 'GSSA 항공 화물 대리점 완벽 가이드 (2026)',
    category: 'GSSA',
    description: '항공사가 직판 대신 GSSA를 선택하는 이유, 한국 시장 구조, IATA CASS 정산 흐름, KPI까지.',
    pubDate: '2026-W18',
  },
  {
    slug: 'incoterms-2020-dap-explained',
    title: '인코텀즈 2020 DAP 완전 분해 — UPS/DHL Express는 왜 DAP만 쓸까',
    category: 'Incoterms',
    description: 'DAP 정의, 비용·위험 분기점, EXW/FOB과의 차이, UPS/DHL Express의 DAP-only 정책 배경.',
    pubDate: '2026-W19',
  },
  {
    slug: 'air-freight-rate-indices',
    title: '항공 화물 운임 지수 읽는 법 — TAC vs Drewry vs Xeneta',
    category: 'Rates',
    description: '세 지수의 산출 방식, 한국발 운임 추적에 적합한 지수 선택법.',
    pubDate: '2026-W20',
  },
  {
    slug: 'fsc-complete-guide',
    title: 'FSC(유류할증료) 완전 가이드 — UPS·DHL 매주 월요일 갱신 메커니즘',
    category: 'FSC',
    description: 'UPS/DHL FSC 산출식, 변동 패턴, 국가별 차이, 화주가 견적에 반영하는 법.',
    pubDate: '2026-W21',
  },
  {
    slug: 'korea-air-cargo-market-2026',
    title: '한국 항공 화물 시장 2026 — 경상수지 흑자, 반도체·이차전지·뷰티가 뭘 바꿨나',
    category: 'Market',
    description: '2026년 한국발 항공 화물 톤수·노선·운임 트렌드와 GSSA 기회.',
    pubDate: '2026-W22',
  },
  {
    slug: 'iata-dg-air-shipping',
    title: 'IATA 위험물(DG) 항공 운송 9개 클래스 — 화주가 알아야 할 핵심',
    category: 'DG',
    description: 'DGR 클래스 1~9 분류, MSDS 작성, UN 번호, PI 매핑, 거절 사례.',
    pubDate: '2026-W23',
  },
  {
    slug: 'cold-chain-pharma-logistics',
    title: '콜드체인 의약품 물류 — CEIV Pharma 인증과 한국 보세창고 옵션',
    category: 'Cold Chain',
    description: 'GDP·CEIV Pharma 차이, 인천공항 콜드존, 2~8°C/15~25°C 온도대 관리.',
    pubDate: '2026-W24',
  },
  {
    slug: 'korea-ecommerce-direct-shipping',
    title: '한국 이커머스 해외 직배송 — UPS·DHL·EMS·OSF 비교',
    category: 'E-commerce',
    description: '소형 패키지 직배송 4대 옵션 비용·소요일·관세 처리 비교.',
    pubDate: '2026-W25',
  },
  {
    slug: 'ups-vs-dhl-express-korea',
    title: 'UPS vs DHL Express 한국 — 지역별 강점·약점 매핑',
    category: 'Carrier Comparison',
    description: '두 캐리어의 한국 발 권역별 우위, FSC 정책, 부가서비스 차이.',
    pubDate: '2026-W26',
  },
  {
    slug: 'ocean-freight-scfi-ccfi',
    title: '해상 운임 지수 SCFI·CCFI 읽는 법 — 항공 운임과의 상관관계',
    category: 'Ocean Freight',
    description: 'SCFI/CCFI 산출, 모달 시프트(항공↔해상) 트리거, 화주 의사결정.',
    pubDate: '2026-W27',
  },
] as const;

export default function InsightsHome() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '4rem 1.5rem',
      }}
    >
      <header style={{ marginBottom: '3rem' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#0b1e3f',
            margin: 0,
          }}
        >
          BridgeLogis Insights
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            color: '#475569',
            marginTop: '0.75rem',
            maxWidth: 640,
          }}
        >
          항공 화물·국제 특송·GSSA·인코텀즈·FSC·콜드체인 — 한국 화주와 물류 담당자를 위한
          실무 인사이트.
        </p>
      </header>

      <section aria-labelledby='pillars-heading'>
        <h2
          id='pillars-heading'
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#0b1e3f',
            marginBottom: '1.5rem',
          }}
        >
          Pillar 콘텐츠 (10개 — 한·영 각 1편씩 총 20편 발행 예정)
        </h2>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: '1rem',
          }}
        >
          {PILLARS.map((pillar) => (
            <li
              key={pillar.slug}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '1.25rem 1.5rem',
                background: '#ffffff',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <Link
                href={`/pillars/${pillar.slug}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#1e40af',
                    background: '#dbeafe',
                    padding: '0.125rem 0.5rem',
                    borderRadius: 4,
                    marginBottom: '0.5rem',
                  }}
                >
                  {pillar.category}
                </span>
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#0b1e3f',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.4,
                  }}
                >
                  {pillar.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.9375rem',
                    color: '#475569',
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {pillar.description}
                </p>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#94a3b8',
                    marginTop: '0.5rem',
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  발행 예정: {pillar.pubDate}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer
        style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.875rem',
          color: '#64748b',
        }}
      >
        <p>
          본 콘텐츠는 일부 AI 도구를 활용해 작성된 후 BridgeLogis 운영팀이 검수했습니다.
          법률·관세·항공 안전 관련 의사결정 시 반드시 공식 출처(IATA, ICAO, 국세청, 외교부)를
          교차 확인하시기 바랍니다.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          © {new Date().getFullYear()} Goodman GLS / J-Ways. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
