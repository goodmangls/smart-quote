import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <section>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h2>
      <p style={{ margin: '0 0 1.5rem', lineHeight: 1.6, color: '#374151' }}>
        Admin shell placeholder. 콘텐츠 관리·draft 미리보기·통계 등은 별 사이클(
        <code>insights-admin-features</code>)에서 추가됩니다.
      </p>
      <div
        style={{
          padding: '1.25rem 1.5rem',
          background: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#0b1e3f' }}>
          현재 사이클 범위
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6, color: '#4b5563' }}>
          <li>Vercel 배포 + 메인 도메인 rewrite</li>
          <li>Rails JWT (httpOnly bl_session cookie) + role=admin 미들웨어 게이트</li>
          <li>빈 dashboard / login redirect 골격</li>
        </ul>
      </div>
    </section>
  );
}
