import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from '../CollapsibleSection';

// WAI-ARIA APG Disclosure: the trigger is a real button inside the heading,
// it reports aria-expanded, and aria-controls always points at a panel that exists.
describe('CollapsibleSection', () => {
  it('starts closed: aria-expanded=false, panel hidden, children not mounted', () => {
    render(
      <CollapsibleSection title='Audit Log'>
        <p>Body</p>
      </CollapsibleSection>,
    );

    const trigger = screen.getByRole('button', { name: 'Audit Log' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel).toBeInTheDocument();
    expect(panel).not.toBeVisible();
    // Lazy mount is load-bearing: admin widgets fetch on mount.
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });

  it('puts the trigger inside the heading, not the heading inside the button', () => {
    render(
      <CollapsibleSection title='Audit Log'>
        <p>Body</p>
      </CollapsibleSection>,
    );

    const heading = screen.getByRole('heading', { name: 'Audit Log' });
    expect(heading).toContainElement(screen.getByRole('button', { name: 'Audit Log' }));
  });

  it('opens on click and links the panel back to its trigger', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title='Audit Log'>
        <p>Body</p>
      </CollapsibleSection>,
    );

    const trigger = screen.getByRole('button', { name: 'Audit Log' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!);
    expect(panel).toBeVisible();
    expect(panel).toHaveAttribute('aria-labelledby', trigger.id);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('toggles from the keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title='Audit Log'>
        <p>Body</p>
      </CollapsibleSection>,
    );

    const trigger = screen.getByRole('button', { name: 'Audit Log' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('honours defaultOpen', () => {
    render(
      <CollapsibleSection title='Audit Log' defaultOpen>
        <p>Body</p>
      </CollapsibleSection>,
    );

    expect(screen.getByRole('button', { name: 'Audit Log' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('gives each instance its own ids', () => {
    render(
      <>
        <CollapsibleSection title='One'>
          <p>1</p>
        </CollapsibleSection>
        <CollapsibleSection title='Two'>
          <p>2</p>
        </CollapsibleSection>
      </>,
    );

    const one = screen.getByRole('button', { name: 'One' });
    const two = screen.getByRole('button', { name: 'Two' });
    expect(one.id).not.toBe(two.id);
    expect(one.getAttribute('aria-controls')).not.toBe(two.getAttribute('aria-controls'));
  });
});

// Regression: AdminWidgets wraps every section in ONE Suspense boundary and the
// widgets are React.lazy. Opening a section used to suspend that shared boundary,
// which hid all sections — the focused trigger included — and dropped keyboard
// focus to <body>. The panel must catch its own suspension.
describe('CollapsibleSection with a lazy child', () => {
  it('keeps the trigger visible and focused while the panel loads', async () => {
    let resolveChunk!: (mod: { default: React.ComponentType }) => void;
    const LazyBody = React.lazy(
      () => new Promise<{ default: React.ComponentType }>((resolve) => (resolveChunk = resolve)),
    );
    const user = userEvent.setup();
    render(
      <React.Suspense fallback={<p>outer fallback</p>}>
        <CollapsibleSection title='Audit Log'>
          <LazyBody />
        </CollapsibleSection>
      </React.Suspense>,
    );

    const trigger = screen.getByRole('button', { name: 'Audit Log' });
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(screen.queryByText('outer fallback')).not.toBeInTheDocument();
    expect(trigger).toBeVisible();
    expect(trigger).toHaveFocus();
    expect(
      within(screen.getByRole('region', { name: 'Audit Log' })).getByRole('status', {
        name: 'Loading',
      }),
    ).toBeInTheDocument();

    await act(async () => resolveChunk({ default: () => <p>Loaded body</p> }));
    expect(await screen.findByText('Loaded body')).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
