/**
 * BridgeLogis — JSON-LD NewsArticle schema component
 * Phase 1.5 SEO infra deliverable (Phase 2 ready, not yet wired in)
 *
 * Usage (Phase 2 — when /insights launches):
 *   <JsonLdNewsArticle
 *     headline="ICN→LAX 익스프레스 운임 5월 1주차 변동 요약"
 *     description="UPS FSC 45.50% 동결, DHL +0.5%p, KE 카고 95% util."
 *     datePublished="2026-05-01T09:00:00+09:00"
 *     url="https://bridgelogis.com/insights/daily-brief/2026-05-01"
 *   />
 *
 * Validation: https://search.google.com/test/rich-results
 */

import React from 'react';

interface Props {
  headline: string;
  description: string;
  datePublished: string; // ISO 8601 with timezone
  dateModified?: string;
  authorName?: string;
  imageUrl?: string;
  url: string;
  keywords?: string[];
  articleSection?: string; // e.g., "Air Cargo", "FSC Trends"
  inLanguage?: 'ko-KR' | 'en' | 'zh' | 'ja';
}

const PUBLISHER = {
  name: 'BridgeLogis',
  url: 'https://bridgelogis.com',
  logoUrl: 'https://bridgelogis.com/icon-512.png',
} as const;

export const JsonLdNewsArticle: React.FC<Props> = ({
  headline,
  description,
  datePublished,
  dateModified,
  authorName = 'BridgeLogis Editorial',
  imageUrl = 'https://bridgelogis.com/icon-512.png',
  url,
  keywords,
  articleSection,
  inLanguage = 'ko-KR',
}) => {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    description,
    image: [imageUrl],
    datePublished,
    dateModified: dateModified ?? datePublished,
    inLanguage,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: PUBLISHER.url,
    },
    publisher: {
      '@type': 'Organization',
      name: PUBLISHER.name,
      logo: {
        '@type': 'ImageObject',
        url: PUBLISHER.logoUrl,
        width: 512,
        height: 512,
      },
      url: PUBLISHER.url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    isAccessibleForFree: true,
  };

  if (keywords && keywords.length > 0) schema.keywords = keywords.join(', ');
  if (articleSection) schema.articleSection = articleSection;

  return (
    <script
      type="application/ld+json"
      // JSON.stringify is XSS-safe for valid schema objects (no user input executed)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

/**
 * Companion: Organization-level JSON-LD already inlined in index.html — this
 * component is for Phase 2 use (e.g., per-page override on /insights).
 */
export default JsonLdNewsArticle;
