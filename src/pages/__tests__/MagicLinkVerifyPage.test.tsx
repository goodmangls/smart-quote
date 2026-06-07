import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MagicLinkVerifyPage from '../MagicLinkVerifyPage';

const loginWithMagicLink = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ loginWithMagicLink }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/auth/verify' element={<MagicLinkVerifyPage />} />
        <Route path='/dashboard' element={<div>DASHBOARD</div>} />
        <Route path='/login' element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MagicLinkVerifyPage', () => {
  beforeEach(() => {
    loginWithMagicLink.mockReset();
  });

  it('shows invalidLink error when token query param is missing', async () => {
    renderPage('/auth/verify');

    await waitFor(() => {
      expect(screen.getByText('auth.magicLink.invalidLink')).toBeInTheDocument();
    });
    expect(loginWithMagicLink).not.toHaveBeenCalled();
  });

  it('calls loginWithMagicLink exactly once even if effect runs twice (StrictMode guard)', async () => {
    loginWithMagicLink.mockResolvedValue({ success: true });
    renderPage('/auth/verify?token=abc123');

    await waitFor(() => {
      expect(loginWithMagicLink).toHaveBeenCalledTimes(1);
    });
    expect(loginWithMagicLink).toHaveBeenCalledWith('abc123');
  });

  it('displays the returned error message when verification fails', async () => {
    loginWithMagicLink.mockResolvedValue({
      success: false,
      error: 'Custom failure reason',
    });
    renderPage('/auth/verify?token=abc');

    await waitFor(() => {
      expect(screen.getByText('Custom failure reason')).toBeInTheDocument();
      expect(screen.getByText('auth.magicLink.failed')).toBeInTheDocument();
      expect(screen.getByText('auth.magicLink.backToLogin')).toBeInTheDocument();
    });
  });

  it('falls back to expired message when error is missing', async () => {
    loginWithMagicLink.mockResolvedValue({ success: false });
    renderPage('/auth/verify?token=abc');

    await waitFor(() => {
      expect(screen.getByText('auth.magicLink.expired')).toBeInTheDocument();
    });
  });

  it('strips the token from the URL before verification resolves', async () => {
    let resolveLogin!: (value: { success: boolean }) => void;
    loginWithMagicLink.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    renderPage('/auth/verify?token=abc');

    await waitFor(() => {
      expect(loginWithMagicLink).toHaveBeenCalledWith('abc');
    });
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/auth/verify');

    resolveLogin({ success: true });
    await waitFor(() => {
      expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
    });
    replaceStateSpy.mockRestore();
  });
});
