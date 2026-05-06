'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang='ko'>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard Variable", "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '4rem 1.5rem',
          textAlign: 'center',
          color: '#0b1e3f',
          background: '#ffffff',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '2rem' }}>500 — Internal Error</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          서비스 처리 중 오류가 발생했습니다. {error.digest ? `(ref: ${error.digest})` : ''}
        </p>
        <button
          type='button'
          onClick={reset}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            border: 0,
            background: '#0891b2',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
