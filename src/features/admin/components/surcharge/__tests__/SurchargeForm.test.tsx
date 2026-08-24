import { render, screen } from '@testing-library/react';
import { SurchargeForm } from '../SurchargeForm';

const renderForm = (overrides: Partial<React.ComponentProps<typeof SurchargeForm>> = {}) =>
  render(
    <SurchargeForm
      form={{}}
      editingId={null}
      saving={false}
      onUpdateForm={vi.fn()}
      onSave={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />
  );

/**
 * Every field needs an accessible name (WCAG 4.1.2).
 *
 * The form already showed a visible label above each field, but as a sibling
 * <label> with no htmlFor — visually a label, and nothing at all to a screen
 * reader. Associating the existing text beats adding an aria-label: the visible
 * and accessible names then match (WCAG 2.5.3), and clicking the label focuses
 * the field.
 *
 * The catch-all is the part that lasts. Naming each field individually pins
 * today's form; the sweep fails for any field added later without a name, which
 * is how eleven of them accumulated here.
 */
describe('SurchargeForm — accessible names', () => {
  const FIELDS = [
    'Code',
    'Carrier',
    'Name (EN)',
    'Name (KO)',
    'Type',
    'Amount',
    'Zone',
    'Country Codes',
    'Source URL',
    'Effective From',
    'Effective To',
    'Active',
  ];

  it.each(FIELDS)('names the %s field', (label) => {
    renderForm();

    // Escape regex metacharacters in labels like "Name (EN)".
    const pattern = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    expect(screen.getByLabelText(pattern)).toBeInTheDocument();
  });

  it('leaves no field without an accessible name', () => {
    const { container } = renderForm();

    const unnamed = Array.from(
      container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea'
      )
    ).filter((el) => {
      if (el.getAttribute('type') === 'hidden') return false;
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
      return !el.labels?.length;
    });

    expect(unnamed.map((el) => el.outerHTML.slice(0, 60))).toEqual([]);
  });

  it('gives each field a unique id so labels point at one control each', () => {
    const { container } = renderForm();

    const ids = Array.from(container.querySelectorAll('input, select, textarea'))
      .map((el) => el.id)
      .filter(Boolean);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps ids unique when two forms are on the page at once', () => {
    const { container } = render(
      <>
        <SurchargeForm
          form={{}}
          editingId={null}
          saving={false}
          onUpdateForm={vi.fn()}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
        <SurchargeForm
          form={{}}
          editingId={2}
          saving={false}
          onUpdateForm={vi.fn()}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      </>
    );

    const ids = Array.from(container.querySelectorAll('input, select, textarea'))
      .map((el) => el.id)
      .filter(Boolean);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
