/**
 * Vitest unit tests — Disclaimer + RelatedPillars MDX components
 * Verifies that:
 *   • Disclaimer renders 3 standard blocks for non-predictive topics
 *   • Disclaimer renders 4 blocks (incl. forecast) for predictive topics
 *   • Disclaimer keyword set matches scripts/pillar-validate.mjs expectations
 *   • RelatedPillars filters unknown slugs + selects KO/EN titles by lang
 *
 * Run: cd apps/insights && npx vitest run lib/components/
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Disclaimer } from './Disclaimer';
import { RelatedPillars } from './RelatedPillars';

// Validator keyword sets (must remain in sync with scripts/pillar-validate.mjs)
const KW_KO = {
  rates: ['실제 운임은', '인코텀즈', '계약 조건', 'BridgeLogis 운임 계산기'],
  legal: ['법률·세무·관세 자문이 아닙니다', '관세사·세무사', '책임지지 않습니다'],
  forecast: ['미래', '예측', '시장 상황', '의사결정 시 최신'],
};
const KW_EN = {
  rates: ['actual rate', 'BridgeLogis', 'real', 'incoterm'],
  legal: ['not legal', 'tax', 'customs advice', 'qualified', 'bear no responsibility'],
  forecast: ['as of the publication date', 'future', 'predictions', 'rapidly'],
};

function getRenderedText(jsx: React.ReactElement): string {
  const { container } = render(jsx);
  return (container.textContent ?? '').toLowerCase();
}

describe('Disclaimer — Korean', () => {
  it('renders rates + legal + AI for non-predictive topic', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="gssa" />);
    KW_KO.rates.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
    KW_KO.legal.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
    expect(text).toContain('claude');
    expect(text).toContain('editorial@goodmangls.com');
    // forecast keywords absent for non-predictive
    expect(text).not.toContain(KW_KO.forecast[0].toLowerCase());
  });

  it('renders forecast block for predictive topic (fsc-trends)', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="fsc-trends" />);
    KW_KO.forecast.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
  });

  it('renders forecast block for korea-market', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="korea-market" />);
    KW_KO.forecast.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
  });

  it('renders forecast block for carrier-news', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="carrier-news" />);
    KW_KO.forecast.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
  });

  it('skips forecast block for non-predictive topics (dg)', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="dg" />);
    expect(text).not.toContain('미래 시장 동향');
  });

  it('uses ko-KR semantic label', () => {
    const { container } = render(<Disclaimer lang="ko" topic="gssa" />);
    const section = container.querySelector('.disclaimers');
    expect(section).toHaveAttribute('aria-label', '면책 고지');
  });
});

describe('Disclaimer — English', () => {
  it('renders rates + legal + AI for non-predictive topic', () => {
    const text = getRenderedText(<Disclaimer lang="en" topic="gssa" />);
    KW_EN.rates.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
    KW_EN.legal.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
    expect(text).toContain('claude');
    expect(text).toContain('editorial@goodmangls.com');
  });

  it('renders forecast block for predictive topic', () => {
    const text = getRenderedText(<Disclaimer lang="en" topic="fsc-trends" />);
    KW_EN.forecast.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
  });

  it('omits forecast for non-predictive topic', () => {
    const text = getRenderedText(<Disclaimer lang="en" topic="customs-trade" />);
    expect(text).not.toContain('as of the publication date');
  });

  it('uses English semantic label', () => {
    const { container } = render(<Disclaimer lang="en" topic="gssa" />);
    const section = container.querySelector('.disclaimers');
    expect(section).toHaveAttribute('aria-label', 'Disclaimers');
  });
});

describe('Disclaimer — without topic prop', () => {
  it('renders rates + legal + AI when topic is undefined', () => {
    const text = getRenderedText(<Disclaimer lang="ko" />);
    KW_KO.rates.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
    KW_KO.legal.forEach((kw) => expect(text).toContain(kw.toLowerCase()));
    // forecast omitted (no topic = treated as non-predictive)
    expect(text).not.toContain(KW_KO.forecast[0].toLowerCase());
  });
});

describe('RelatedPillars', () => {
  it('renders cards for known slugs (Korean)', () => {
    const { getByText } = render(
      <RelatedPillars
        slugs={['01-gssa-complete-guide', '04-fsc-complete-guide']}
        lang="ko"
      />,
    );
    expect(getByText('GSSA 항공 화물 대리점 완전 가이드')).toBeInTheDocument();
    expect(getByText('FSC 유류할증료 완벽 가이드')).toBeInTheDocument();
  });

  it('renders cards for known slugs (English)', () => {
    const { getByText } = render(
      <RelatedPillars
        slugs={['01-gssa-complete-guide', '04-fsc-complete-guide']}
        lang="en"
      />,
    );
    expect(getByText('Complete Guide to GSSA in Korea')).toBeInTheDocument();
    expect(getByText('Fuel Surcharge Complete Guide')).toBeInTheDocument();
  });

  it('silently filters unknown slugs', () => {
    const { container } = render(
      <RelatedPillars slugs={['unknown-slug', '01-gssa-complete-guide']} lang="ko" />,
    );
    const cards = container.querySelectorAll('.related-pillars__card');
    expect(cards.length).toBe(1);
  });

  it('returns empty list when all slugs unknown', () => {
    const { container } = render(
      <RelatedPillars slugs={['x', 'y', 'z']} lang="ko" />,
    );
    const cards = container.querySelectorAll('.related-pillars__card');
    expect(cards.length).toBe(0);
  });

  it('renders 3 standard CTAs (Korean)', () => {
    const { getByText } = render(<RelatedPillars slugs={[]} lang="ko" />);
    expect(getByText(/지금 견적 받기/)).toBeInTheDocument();
    expect(getByText(/모든 인사이트 보기/)).toBeInTheDocument();
    expect(getByText(/BridgeLogis 사용 가이드/)).toBeInTheDocument();
  });

  it('renders 3 standard CTAs (English)', () => {
    const { getByText } = render(<RelatedPillars slugs={[]} lang="en" />);
    expect(getByText(/Get a Quote/)).toBeInTheDocument();
    expect(getByText(/All Insights/)).toBeInTheDocument();
    expect(getByText(/BridgeLogis Guide/)).toBeInTheDocument();
  });

  it('uses correct heading per lang', () => {
    const { container: cKo } = render(<RelatedPillars slugs={[]} lang="ko" />);
    expect(cKo.querySelector('h2')?.textContent).toBe('함께 읽으면 좋은 글');
    const { container: cEn } = render(<RelatedPillars slugs={[]} lang="en" />);
    expect(cEn.querySelector('h2')?.textContent).toBe('Related Reading');
  });

  it('Topic href uses topic-page route', () => {
    const { container } = render(
      <RelatedPillars slugs={['01-gssa-complete-guide']} lang="ko" />,
    );
    const link = container.querySelector('.related-pillars__card');
    expect(link?.getAttribute('href')).toBe('/insights/topics/gssa');
  });
});

describe('Cross-validation with pillar-validate.mjs', () => {
  it('Disclaimer KO non-predictive includes all rates+legal keywords', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="gssa" />);
    const expected = [...KW_KO.rates, ...KW_KO.legal];
    for (const kw of expected) {
      expect(text).toContain(kw.toLowerCase());
    }
  });

  it('Disclaimer KO predictive includes all 3 disclaimer keyword sets', () => {
    const text = getRenderedText(<Disclaimer lang="ko" topic="fsc-trends" />);
    const expected = [...KW_KO.rates, ...KW_KO.legal, ...KW_KO.forecast];
    for (const kw of expected) {
      expect(text).toContain(kw.toLowerCase());
    }
  });

  it('Disclaimer EN predictive includes all 3 disclaimer keyword sets', () => {
    const text = getRenderedText(<Disclaimer lang="en" topic="korea-market" />);
    const expected = [...KW_EN.rates, ...KW_EN.legal, ...KW_EN.forecast];
    for (const kw of expected) {
      expect(text).toContain(kw.toLowerCase());
    }
  });
});
