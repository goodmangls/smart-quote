/** @type {import('next').NextConfig} */
const nextConfig = {
  // BridgeLogis Insights는 메인 도메인 /insights 경로 하위에서 서빙
  basePath: '/insights',
  assetPrefix: '/insights',
  reactStrictMode: true,
  poweredByHeader: false,

  // pageExtensions 에 js/jsx 를 빼면 Next 15 의 내부 _error.js / _document.js
  // 가 user route 로 잘못 인식되어 prerender 시 <Html> import 충돌이 발생한다.
  // js/jsx 를 포함시켜 Next.js 내장 fallback 페이지가 정상 처리되도록 함.
  // (MDX 콘텐츠 라우팅은 별 사이클 insights-content-migration 에서 .mdx 추가.)
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // 이미지 최적화 (메인 도메인 자산 공유)
  images: {
    domains: ['bridgelogis.com', 'cdn.bridgelogis.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

};

export default nextConfig;
