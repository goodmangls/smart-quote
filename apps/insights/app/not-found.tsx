import Link from 'next/link';

export const metadata = {
  title: 'Not Found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '4rem 1.5rem',
        textAlign: 'center',
        color: '#0b1e3f',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '2rem' }}>404 — Not Found</h1>
      <p style={{ margin: 0, color: '#475569' }}>
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <Link
        href='/insights'
        style={{ color: '#0891b2', textDecoration: 'underline', fontWeight: 600 }}
      >
        Insights 홈으로 돌아가기
      </Link>
    </main>
  );
}
