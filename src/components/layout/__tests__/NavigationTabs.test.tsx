import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationTabs } from '../NavigationTabs';
import { VIEW_PANEL_ID, viewTabId, type AppView } from '../quoteViews';

function Harness({ initial = 'calculator' as AppView, onChange = vi.fn() }) {
  const [view, setView] = useState<AppView>(initial);
  return (
    <NavigationTabs
      currentView={view}
      onViewChange={(next) => {
        onChange(next);
        setView(next);
      }}
    />
  );
}

// WAI-ARIA APG Tabs, automatic activation: one tab stop, arrows move and select.
describe('NavigationTabs', () => {
  it('is a named tablist, not a navigation landmark', () => {
    render(<Harness />);

    expect(screen.getByRole('tablist', { name: 'Quote views' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('uses a roving tabindex: only the selected tab is in the tab order', () => {
    render(<Harness />);

    expect(screen.getByRole('tab', { name: 'Calculator' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('tabindex', '-1');
  });

  it('links every tab to the shared view panel', () => {
    render(<Harness />);

    for (const view of ['calculator', 'history'] as const) {
      const tab = document.getElementById(viewTabId(view));
      expect(tab).toHaveAttribute('role', 'tab');
      expect(tab).toHaveAttribute('aria-controls', VIEW_PANEL_ID);
    }
  });

  it('ArrowRight selects and focuses the next tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    screen.getByRole('tab', { name: 'Calculator' }).focus();
    await user.keyboard('{ArrowRight}');

    const history = screen.getByRole('tab', { name: 'History' });
    expect(onChange).toHaveBeenLastCalledWith('history');
    expect(history).toHaveAttribute('aria-selected', 'true');
    expect(history).toHaveFocus();
    expect(history).toHaveAttribute('tabindex', '0');
  });

  it('arrows wrap around at both ends', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole('tab', { name: 'Calculator' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Calculator' })).toHaveFocus();
  });

  it('Home and End jump to the first and last tab', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole('tab', { name: 'Calculator' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Calculator' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Calculator' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('ignores unrelated keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    screen.getByRole('tab', { name: 'Calculator' }).focus();
    await user.keyboard('{ArrowDown}a');
    expect(onChange).not.toHaveBeenCalled();
  });
});
