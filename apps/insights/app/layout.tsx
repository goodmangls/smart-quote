import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL('https://bridgelogis.com'),
  title: {
    default: 'Insights — BridgeLogis',
    template: '%s | BridgeLogis Insights',
  },
  description: '글로벌 익스프레스 화물 운임 일일 시장 동향 — by Goodman GLS',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'BridgeLogis',
  },
  twitter: { card: 'summary_large_image' },
  alternates: {
    types: {
      'application/rss+xml': 'https://bridgelogis.com/insights/feed.xml',
    },
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
