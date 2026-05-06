import type { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f6f8',
        color: '#0b1e3f',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Pretendard Variable", "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header
        style={{
          padding: '1rem 2rem',
          background: '#0b1e3f',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid #1f3252',
        }}
      >
        <span
          aria-hidden='true'
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '9999px',
            background: '#22d3ee',
          }}
        />
        <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          BridgeLogis Insights — Admin
        </h1>
      </header>
      <main style={{ padding: '2rem', maxWidth: '64rem', margin: '0 auto' }}>{children}</main>
    </div>
  );
}
