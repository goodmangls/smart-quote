import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [['remark-gfm']],
    rehypePlugins: [['rehype-slug'], ['rehype-autolink-headings']],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mounted under /insights via Vercel rewrite
  basePath: '/insights',
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'bridgelogis.com' },
      { protocol: 'https', hostname: 'cdn.bridgelogis.com' },
    ],
  },
  experimental: {
    mdxRs: false,
  },
};

export default withMDX(nextConfig);
