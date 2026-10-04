import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../LoginPage';

const login = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));

vi.mock('@/components/layout/Header', () => ({ Header: () => null }));

vi.mock('@/api/authApi', () => ({ requestMagicLink: vi.fn() }));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid='location'>{`${location.pathname}${location.search}`}</div>;
};

function renderLogin(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='*' element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function submitCredentials() {
  fireEvent.change(screen.getByLabelText('auth.email'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'auth.signin' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    sessionStorage.clear();
  });

  it('shows the signed-out notice once when arriving from logout', () => {
    sessionStorage.setItem('bl.auth.signedOut', '1');
    const { unmount } = renderLogin();
    expect(screen.getByRole('status')).toHaveTextContent('auth.signedOut.title');

    // consumed on mount: a refresh (fresh mount) must not show it again
    unmount();
    renderLogin();
    expect(screen.queryByText('auth.signedOut.title')).not.toBeInTheDocument();
  });

  it('shows no notice on a plain visit', () => {
    renderLogin();
    expect(screen.queryByText('auth.signedOut.title')).not.toBeInTheDocument();
  });

  it('clears the signed-out notice once the user tries to sign in', async () => {
    login.mockResolvedValue({ success: false, error: 'nope' });
    sessionStorage.setItem('bl.auth.signedOut', '1');
    renderLogin();
    submitCredentials();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('nope'));
    expect(screen.queryByText('auth.signedOut.title')).not.toBeInTheDocument();
  });

  it('returns to the page ProtectedRoute bounced the user from', async () => {
    login.mockResolvedValue({ success: true });
    renderLogin({ from: { pathname: '/admin', search: '?tab=fsc' } });
    submitCredentials();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=fsc'));
  });

  it('goes to the dashboard when there is nowhere to return to', async () => {
    login.mockResolvedValue({ success: true });
    renderLogin();
    submitCredentials();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'));
  });

  it('labels the forgot-password action as the sign-in link it opens', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'auth.forgotPasswordLink' }));
    expect(screen.getByLabelText('auth.magicLink.emailLabel')).toBeInTheDocument();
  });
});
