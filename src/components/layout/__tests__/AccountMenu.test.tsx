import { render, screen, fireEvent } from '@testing-library/react';
import { AccountMenu } from '../AccountMenu';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

const onOpenSettings = vi.fn();
const onLogout = vi.fn();

function renderMenu() {
  return render(
    <AccountMenu
      name='Jae Hong'
      email='jh@example.com'
      userRole='admin'
      onOpenSettings={onOpenSettings}
      onLogout={onLogout}
    />,
  );
}

const trigger = () => screen.getByRole('button', { name: 'nav.accountMenu' });

describe('AccountMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows initials, name and role on the closed trigger', () => {
    renderMenu();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('JH')).toBeInTheDocument();
    expect(screen.getByText('Jae Hong')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens with the email and puts logout last, focusing the first item', () => {
    renderMenu();
    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('jh@example.com')).toBeInTheDocument();

    const items = screen.getAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual(['settings.account.title', 'nav.logout']);
    expect(items[0]).toHaveFocus();
  });

  it('moves focus with the arrow keys and wraps around', () => {
    renderMenu();
    fireEvent.click(trigger());
    const [settings, logout] = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(logout).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(settings).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(logout).toHaveFocus();
  });

  it('closes on Escape and hands focus back to the trigger', () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes on an outside click', () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('runs the chosen action and closes', () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: 'settings.account.title' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: 'nav.logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('opens from the keyboard with ArrowDown', () => {
    renderMenu();
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
