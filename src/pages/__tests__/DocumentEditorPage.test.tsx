import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DocumentEditorPage from '../DocumentEditorPage';
import { DOCUMENTS } from '@/features/documents/registry';
import { tradeDraft } from '@/features/documents/specs';
import { DOCUMENT_TYPES } from '@/features/documents/types';

vi.mock('@/components/layout/Header', () => ({ Header: () => null }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/documents' element={<p>picker</p>} />
        <Route path='/documents/:type' element={<DocumentEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe('DocumentEditorPage', () => {
  it('redirects an unknown document type to the picker', () => {
    renderAt('/documents/bill-of-lading');
    expect(screen.getByText('picker')).toBeInTheDocument();
  });

  it('updates the quotation preview as the form is filled', async () => {
    const user = userEvent.setup();
    renderAt('/documents/quotation');

    await user.type(screen.getByLabelText('To (recipient)'), 'Acme Trading');
    const amount = screen.getByLabelText('Amount (KRW)');
    await user.clear(amount);
    await user.type(amount, '1000000');

    const sheet = screen.getByRole('article', { name: 'Quotation preview' });
    expect(within(sheet).getByText('Acme Trading')).toBeInTheDocument();
    // 1,000,000 + 10% VAT on top
    expect(within(sheet).getByText('KRW 1,100,000')).toBeInTheDocument();
  });

  it('accepts a decimal that starts with zero, typed key by key', async () => {
    const user = userEvent.setup();
    renderAt('/documents/commercial-invoice');

    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.type(screen.getByLabelText('Unit price (USD)'), '0.45');

    const sheet = screen.getByRole('article', { name: 'Commercial invoice preview' });
    expect(within(sheet).getByText('0.45')).toBeInTheDocument();
    expect(within(sheet).getByText('USD 4.50')).toBeInTheDocument();
  });

  it('shows invoice lines on the packing list because both share one shipment', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/documents/commercial-invoice');

    await user.type(screen.getByLabelText('Invoice No.'), 'CI-2026-0042');
    await user.type(screen.getByLabelText('Description of goods'), 'Cotton T-shirts');
    unmount(); // flushes the pending save, as navigating away does

    expect(window.localStorage.getItem(tradeDraft.storageKey)).toContain('CI-2026-0042');

    renderAt('/documents/packing-list');
    const sheet = screen.getByRole('article', { name: 'Packing list preview' });
    expect(within(sheet).getByText('CI-2026-0042')).toBeInTheDocument();
    expect(within(sheet).getByText('Cotton T-shirts')).toBeInTheDocument();
  });

  it('carries the shared shipment onto the shipping instruction, plus its own fields', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/documents/commercial-invoice');
    await user.type(screen.getByLabelText('Invoice No.'), 'CI-77');
    unmount();

    renderAt('/documents/shipping-instruction');
    await user.selectOptions(screen.getByLabelText('Freight paid by'), 'consignee');
    const sheet = screen.getByRole('article', { name: 'Shipping instruction preview' });
    expect(within(sheet).getByText('CI-77')).toBeInTheDocument();
    const payerBox = within(sheet).getByText('Freight Charges Paid By').parentElement!;
    expect(within(payerBox).getByText('Consignee')).toBeInTheDocument();
  });

  it('charges VAT on taxable freight-invoice lines only', async () => {
    const user = userEvent.setup();
    renderAt('/documents/freight-invoice');

    // Default lines: freight and fuel are zero-rated, pickup is taxable (10%).
    const rates = screen.getAllByLabelText('Rate (KRW)');
    await user.type(rates[0], '1000000');
    await user.type(rates[2], '50000');

    const sheet = screen.getByRole('article', { name: 'Freight invoice preview' });
    expect(within(sheet).getByText('KRW 5,000')).toBeInTheDocument();
    expect(within(sheet).getByText('KRW 1,055,000')).toBeInTheDocument();
  });
});

describe.each(DOCUMENT_TYPES)('the %s editor', (type) => {
  it('renders a printable preview and is listed in the picker registry', () => {
    renderAt(`/documents/${type}`);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(DOCUMENTS.some((d) => d.type === type)).toBe(true);
  });
});
