import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, EnglishOnly, useLanguage } from '../LanguageContext';
import { translations } from '@/i18n/translations';

const Probe = ({ id }: { id: string }) => {
  const { language, t } = useLanguage();
  return <p data-testid={id}>{`${language}:${t('auth.signin')}`}</p>;
};

afterEach(() => {
  localStorage.removeItem('smartQuoteLanguage');
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('EnglishOnly', () => {
  // Sign-in screens are what an overseas partner sees first. A Korean admin's
  // saved preference (or an in-session switch) must not turn them Korean.
  it('renders English inside even when Korean is selected', () => {
    localStorage.setItem('smartQuoteLanguage', 'ko');
    render(
      <LanguageProvider>
        <Probe id='outside' />
        <EnglishOnly>
          <Probe id='inside' />
        </EnglishOnly>
      </LanguageProvider>,
    );

    expect(screen.getByTestId('inside')).toHaveTextContent(`en:${translations.en['auth.signin']}`);
    expect(screen.getByTestId('outside')).toHaveTextContent(`ko:${translations.ko['auth.signin']}`);
  });

  it('leaves the saved preference alone, so the app is Korean again after sign-in', () => {
    localStorage.setItem('smartQuoteLanguage', 'ko');
    render(
      <LanguageProvider>
        <EnglishOnly>
          <Probe id='inside' />
        </EnglishOnly>
      </LanguageProvider>,
    );
    expect(localStorage.getItem('smartQuoteLanguage')).toBe('ko');
  });
});

// Route wiring: the wrapper is useless if a sign-in route forgets it.
describe('sign-in routes', () => {
  it.each(['/login', '/signup'])('%s is English for a Korean-preferring visitor', async (path) => {
    localStorage.setItem('smartQuoteLanguage', 'ko');
    // Signed out: the session refresh is rejected.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })),
    );
    window.history.pushState({}, '', path);
    const { default: App } = await import('../../App');

    await act(async () => {
      render(<App />);
    });

    const heading = await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(heading.textContent).not.toMatch(/[가-힣]/);
    expect(document.body.textContent ?? '').not.toContain(translations.ko['auth.signin']);
  });
});
