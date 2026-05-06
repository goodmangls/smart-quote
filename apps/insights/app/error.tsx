'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 운영 단계 진입 시 Sentry 등 외부 로깅 연결 후보
    console.error(error);
  }, [error]);

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
      <h1 style={{ margin: 0, fontSize: '2rem' }}>잠시 오류가 발생했습니다</h1>
      <p style={{ margin: 0, color: '#475569' }}>
        페이지를 다시 불러오거나 잠시 후 다시 시도해 주세요.
      </p>
      <button
        type='button'
        onClick={reset}
        style={{
          padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #cbd5e1',
          background: '#0891b2',
          color: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
    </main>
  );
}
