import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL('https://bridgelogis.com'),
  title: {
    default: 'BridgeLogis Insights — 항공 화물·물류 인사이트',
    template: '%s | BridgeLogis Insights',
  },
  description:
    '한국발 국제 특송(UPS/DHL Express)과 GSSA 항공 화물 운송에 대한 실무 인사이트. 인코텀즈 2020, FSC, 콜드체인, 위험물(DG), 해상운임 지수까지 — 화주·물류 담당자를 위한 실용 가이드.',
  applicationName: 'BridgeLogis Insights',
  authors: [{ name: 'Goodman GLS / J-Ways' }],
  generator: 'Next.js',
  keywords: [
    '항공 화물',
    '국제 특송',
    'UPS',
    'DHL Express',
    'GSSA',
    '인코텀즈',
    'FSC',
    '콜드체인',
    'IATA DG',
    'air freight',
    'logistics',
    'Korea export',
  ],
  referrer: 'origin-when-cross-origin',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: 'https://bridgelogis.com/insights',
    siteName: 'BridgeLogis Insights',
    title: 'BridgeLogis Insights',
    description:
      '한국발 국제 특송(UPS/DHL)과 GSSA 항공 화물 운송 인사이트',
    images: [
      {
        url: '/insights/og/default.png',
        width: 1200,
        height: 630,
        alt: 'BridgeLogis Insights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BridgeLogis Insights',
    description: '한국발 국제 특송과 GSSA 항공 화물 운송 인사이트',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/insights',
    languages: {
      'ko-KR': '/insights',
      'en-US': '/insights/en',
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1e3f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  // NOTE: 직접 <head> 안에서 <script type='application/ld+json'> 을 쓰면 Next 15
  // 의 default error page prerender 가 <Html> import 충돌로 실패함. JSON-LD
  // Organization 스키마는 후속 사이클(insights-content-migration 또는 별도
  // `insights-jsonld`)에서 next/script 또는 metadata.other 로 재도입한다.
  return (
    <html lang='ko'>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard Variable", "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif',
          margin: 0,
          color: '#0b1e3f',
          background: '#ffffff',
        }}
      >
        {children}
      </body>
    </html>
  );
}
