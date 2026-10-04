import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedQuotePage from '../SharedQuotePage';
import type { SharedQuoteData } from '@/api/shareApi';

// Characterization test for the public, partner-facing quote page. It pins the
// money and date strings exactly so a redesign can move them around but never
// change what a partner reads. Written against the pre-redesign page first.

// A plain delegating function, not vi.fn(): vi.fn tracks results by attaching
// its own handler to a returned promise, and in the error test that derived
// promise's rejection was charged to the test even though the page catches it
// (the DOM showed the error state correctly and every assertion passed).
let impl: (token: string) => Promise<SharedQuoteData> = async () => QUOTE;
const calls: string[] = [];
vi.mock('@/api/shareApi', () => ({
  getSharedQuote: (token: string) => {
    calls.push(token);
    return impl(token);
  },
}));

const QUOTE: SharedQuoteData = {
  referenceNo: 'SQ-2026-0042',
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '90210',
  overseasCarrier: 'UPS',
  totalQuoteAmount: 16049280,
  totalQuoteAmountUsd: 12345.6,
  appliedZone: 'Z5',
  transitTime: '2-3 days',
  incoterm: 'DAP',
  billableWeight: 12.5,
  // Midday UTC keeps the en-US calendar date stable in any test-runner TZ.
  createdAt: '2026-10-04T12:00:00Z',
  validityDate: '2026-11-03T12:00:00Z',
  shared: true,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/q/tok123']}>
      <Routes>
        <Route path='/q/:token' element={<SharedQuotePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SharedQuotePage', () => {
  beforeEach(() => {
    calls.length = 0;
    impl = async () => QUOTE;
  });

  it('shows the quote figures exactly as before', async () => {
    renderPage();

    expect(await screen.findByText('SQ-2026-0042')).toBeInTheDocument();
    expect(calls).toEqual(['tok123']);

    const text = document.body.textContent ?? '';
    expect(text).toContain('$12,345.60');
    expect(text).toContain('KRW 16,049,280');
    expect(text).toContain('10/4/2026');
    expect(text).toContain('11/3/2026');
    expect(text).toContain('United States (90210)');
    expect(text).toContain('12.5 kg');
    for (const value of ['UPS', 'Z5', '2-3 days', 'DAP']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  // Origins live in ORIGIN_COUNTRY_OPTIONS. Korea is never a destination, so
  // looking the origin up in the destination list fell back to the bare code.
  it('names the origin country instead of printing its code', async () => {
    renderPage();
    await screen.findByText('SQ-2026-0042');
    expect(screen.getByText('South Korea')).toBeInTheDocument();
    expect(screen.queryByText('KR')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\u{1F1F0}\u{1F1F7}/u);
  });

  it('strips the flag emoji from country names', async () => {
    renderPage();
    await screen.findByText('SQ-2026-0042');
    expect(document.body.textContent).not.toMatch(/\u{1F1FA}\u{1F1F8}/u);
  });

  it('omits the valid-until line when there is no validity date', async () => {
    impl = async () => ({ ...QUOTE, validityDate: undefined });
    renderPage();
    await screen.findByText('SQ-2026-0042');
    expect(document.body.textContent).not.toContain('11/3/2026');
  });

  it('shows the API error and a way back to the site when the link is bad', async () => {
    impl = async () => {
      throw new Error('This share link has expired');
    };
    renderPage();
    expect(await screen.findByText('This share link has expired')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to bridgelogis/i })).toHaveAttribute('href', '/');
  });
});
