/**
 * BridgeLogis Insights — Hub page
 * Phase 2 PoC scaffold (Phase 3 W2 메인 워크에서 채워짐)
 */
import Link from 'next/link';

export const revalidate = 60;

export default function InsightsHub() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
      <header style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#0A1628' }}>
          BridgeLogis Insights
        </h1>
        <p style={{ color: '#64748B', marginTop: 8 }}>
          글로벌 익스프레스 화물 운임 일일 시장 동향 — by Goodman GLS
        </p>
      </header>

      <section
        style={{
          padding: 24,
          borderRadius: 16,
          border: '1px solid #0EA5E9',
          background: 'white',
        }}
      >
        <span style={{ fontSize: 14, color: '#64748B' }}>
          📰 Today&apos;s Brief
        </span>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
          Phase 3 W2 — 첫 Daily Brief 발행 예정
        </h2>
        <p style={{ marginTop: 8, color: '#0F172A' }}>
          이 페이지는 Phase 2 scaffold입니다. Hub UI는 Phase 3 W2 (2026-05-11~)
          메인 워크에서 채워집니다.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Link
            href="/quote?utm_source=insights&utm_medium=hub-cta"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: '#0EA5E9',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            ⚡ Quick Quote
          </Link>
        </div>
      </section>

      <footer style={{ marginTop: 64, color: '#64748B', fontSize: 14 }}>
        © 2026 BridgeLogis · by Goodman GLS
      </footer>
    </div>
  );
}
