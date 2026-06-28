import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Intercom } from './Intercom';

const useAuthMock = vi.fn();
const useLanguageMock = vi.fn();
const updateContextMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => useLanguageMock(),
}));

vi.mock('@/lib/intercom', () => ({
  updateContext: (...args: unknown[]) => updateContextMock(...args),
}));

function renderIntercom() {
  return render(
    <MemoryRouter initialEntries={['/']}> 
      <Intercom />
    </MemoryRouter>,
  );
}

describe('Intercom', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: null });
    useLanguageMock.mockReturnValue({ language: 'en' });
    updateContextMock.mockReset();
    window.Intercom = vi.fn();
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Intercom;
    delete window.intercomSettings;
    document.head.innerHTML = '';
  });

  it('boots Intercom for anonymous visitors on the initial page view', async () => {
    renderIntercom();

    await waitFor(() => {
      expect(window.Intercom).toHaveBeenCalledWith(
        'boot',
        expect.objectContaining({
          app_id: 'k5z51xs2',
          language_override: 'en',
          custom_attributes: expect.objectContaining({ browser_language: 'en' }),
        }),
      );
    });

    expect(window.Intercom).not.toHaveBeenCalledWith(
      'boot',
      expect.objectContaining({ user_id: expect.anything() }),
    );
  });

  it('waits for the Intercom script load event before booting anonymous visitors', async () => {
    delete window.Intercom;
    renderIntercom();

    const script = document.getElementById('intercom-script');
    expect(script).toBeTruthy();

    const intercom = vi.fn();
    window.Intercom = intercom;
    script?.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(intercom).toHaveBeenCalledWith(
        'boot',
        expect.objectContaining({ app_id: 'k5z51xs2' }),
      );
    });
  });
});
