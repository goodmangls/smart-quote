import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';

const mockSetLanguage = vi.fn();
const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', role: 'admin' },
    isAuthenticated: true,
    logout: mockLogout,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: mockSetLanguage, t: (key: string) => key }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

vi.mock('@/features/dashboard/components/AccountSettingsModal', () => ({
  AccountSettingsModal: () => null,
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the app title', () => {
    renderHeader();
    expect(screen.getByText('nav.smartQuote')).toBeInTheDocument();
  });

  it('shows current language code', () => {
    renderHeader();
    // The span has `uppercase` CSS class, but text content is lowercase
    expect(screen.getByText('en')).toBeInTheDocument();
  });

  it('opens language dropdown on click', () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText('Select language'));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('한국어')).toBeInTheDocument();
  });

  it('selects a language from dropdown', () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText('Select language'));
    fireEvent.click(screen.getByText('한국어'));
    expect(mockSetLanguage).toHaveBeenCalledWith('ko');
  });

  it('closes language dropdown on outside click', () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText('Select language'));
    expect(screen.getByText('English')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('shows admin link for admin users', () => {
    renderHeader();
    expect(screen.getByText('nav.admin')).toBeInTheDocument();
  });

  it('shows user email prefix and role', () => {
    renderHeader();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('opens mobile menu on hamburger click', () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    // Mobile menu should show dashboard and admin links
    const dashboardLinks = screen.getAllByText('nav.dashboard');
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(2); // desktop + mobile
  });

  it('calls logout on logout button click', () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    fireEvent.click(screen.getByText('nav.logout'));
    expect(mockLogout).toHaveBeenCalled();
  });

  // The notice must be armed before anything can redirect: a ProtectedRoute
  // still mounted during the transition redirects on its own once `user` is
  // null, and router state would not survive that (see loginRedirect.ts).
  it('arms the signed-out flag, then leaves for /login, then clears the session', () => {
    sessionStorage.clear();
    const calls: string[] = [];
    mockNavigate.mockImplementation(() =>
      calls.push(`navigate(flag=${sessionStorage.getItem('bl.auth.signedOut')})`),
    );
    mockLogout.mockImplementation(async () => {
      calls.push('logout');
    });

    renderHeader();
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    fireEvent.click(screen.getByText('nav.logout'));

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    expect(calls).toEqual(['navigate(flag=1)', 'logout']);
  });

  it('logs out from the desktop account menu', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'nav.accountMenu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'nav.logout' }));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.anything());
  });

  it('no longer renders a standalone logout icon button', () => {
    renderHeader();
    expect(screen.queryByRole('button', { name: 'nav.logout' })).not.toBeInTheDocument();
  });
});
