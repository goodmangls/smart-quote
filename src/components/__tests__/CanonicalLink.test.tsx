import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CanonicalLink } from '../CanonicalLink';
import { canonicalFor } from '@/lib/canonical';

/**
 * Before this component existed, index.html's single canonical (the homepage)
 * was served on every route, so /guide — the only public page with real
 * content — declared itself a duplicate of / while sitemap.xml asked Google to
 * index it. Verified against production on 2026-08-26: all three sitemap URLs
 * returned byte-identical HTML with `canonical → https://bridgelogis.com`.
 */
describe('canonicalFor', () => {
  it('keeps the homepage as the bare origin, matching index.html and og:url', () => {
    expect(canonicalFor('/')).toBe('https://bridgelogis.com');
  });

  it('makes an interior route point at itself, not the homepage', () => {
    expect(canonicalFor('/guide')).toBe('https://bridgelogis.com/guide');
  });

  it('normalises a trailing slash so one page cannot claim two canonicals', () => {
    expect(canonicalFor('/guide/')).toBe(canonicalFor('/guide'));
  });

  it('handles a nested path', () => {
    expect(canonicalFor('/q/abc123')).toBe('https://bridgelogis.com/q/abc123');
  });
});

describe('CanonicalLink', () => {
  const readCanonical = () =>
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');

  afterEach(() => {
    document.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove());
  });

  it('rewrites the tag index.html already ships rather than adding a second one', () => {
    const existing = document.createElement('link');
    existing.rel = 'canonical';
    existing.href = 'https://bridgelogis.com';
    document.head.appendChild(existing);

    render(
      <MemoryRouter initialEntries={['/guide']}>
        <CanonicalLink />
      </MemoryRouter>,
    );

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(readCanonical()).toBe('https://bridgelogis.com/guide');
  });

  it('creates the tag if a future template drops it', () => {
    render(
      <MemoryRouter initialEntries={['/guide']}>
        <CanonicalLink />
      </MemoryRouter>,
    );

    expect(readCanonical()).toBe('https://bridgelogis.com/guide');
  });

  it('leaves the homepage canonical unchanged', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CanonicalLink />
      </MemoryRouter>,
    );

    expect(readCanonical()).toBe('https://bridgelogis.com');
  });
});
