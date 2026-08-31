import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FscRateWidget } from '../FscRateWidget';

/**
 * Values chosen so they appear NOWHERE in `src/config/rates.ts`.
 *
 * `useFscRates` seeds its state from those constants, so asserting on the real
 * weekly rates would pass whether the widget rendered the DB read or the seed —
 * and would break every week `/fsc-update` runs.
 */
const DB_RATES = { UPS: 11.11, DHL: 22.22, FEDEX: 33.33 } as const;

const mockUseFscRates = vi.fn();
const mockUpdateFscRate = vi.fn();
const mockRetry = vi.fn();

vi.mock('@/features/dashboard/hooks/useFscRates', () => ({
  useFscRates: () => mockUseFscRates(),
}));

vi.mock('@/api/fscApi', () => ({
  updateFscRate: (...args: unknown[]) => mockUpdateFscRate(...args),
}));

function hookResult(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      rates: Object.fromEntries(
        Object.entries(DB_RATES).map(([carrier, rate]) => [
          carrier,
          { international: rate, domestic: rate },
        ]),
      ),
      updatedAt: '2026-08-31T00:00:00.000Z',
    },
    loading: false,
    error: null,
    retry: mockRetry,
    ...overrides,
  };
}

describe('FscRateWidget', () => {
  beforeEach(() => {
    // resetAllMocks, NOT clearAllMocks: clear leaves implementations in place, so a
    // `mockRetry.mockImplementation` set by one case leaks into the next and silently
    // changes what it renders.
    vi.resetAllMocks();
    mockUseFscRates.mockReturnValue(hookResult());
    mockUpdateFscRate.mockResolvedValue({ success: true });
  });

  it('renders the DB rates rather than the rates.ts seed', () => {
    render(<FscRateWidget />);

    expect(screen.getByText('11.11%')).toBeInTheDocument();
    expect(screen.getByText('22.22%')).toBeInTheDocument();
    expect(screen.getByText('33.33%')).toBeInTheDocument();
  });

  it('writes every percentage carrier on save', async () => {
    const user = userEvent.setup();
    render(<FscRateWidget />);

    await user.click(screen.getByLabelText('FSC 요율 편집'));
    await user.click(screen.getByLabelText('FSC 요율 저장'));

    await waitFor(() => expect(mockUpdateFscRate).toHaveBeenCalledTimes(3));
    expect(mockUpdateFscRate.mock.calls.map((c) => c[0])).toEqual(['UPS', 'DHL', 'FEDEX']);
  });

  describe('partial save failure', () => {
    it('separates saved, indeterminate and untouched carriers', async () => {
      // UPS commits, DHL throws, FEDEX is never sent. Three different states.
      mockUpdateFscRate
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('500 Internal Server Error'));

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.click(screen.getByLabelText('FSC 요율 저장'));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('UPS 는 저장됐습니다');
      expect(alert).toHaveTextContent('DHL 는 응답을 받지 못해 반영 여부가 확실하지 않습니다');
      expect(alert).toHaveTextContent('FEDEX 는 시도되지 않아 이전 요율입니다');
    });

    it('never claims the failed carrier is unchanged — the server may have committed it', async () => {
      mockUpdateFscRate
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('socket hang up'));

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.click(screen.getByLabelText('FSC 요율 저장'));

      const alert = await screen.findByRole('alert');
      expect(alert).not.toHaveTextContent('DHL·FEDEX 는 시도되지 않아');
      expect(alert).not.toHaveTextContent('DHL 는 시도되지 않아');
    });

    it('shows the DB value the failure message tells the admin to check', async () => {
      mockUpdateFscRate
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('socket hang up'));

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.clear(screen.getByLabelText('DHL FSC 요율 (%)'));
      await user.type(screen.getByLabelText('DHL FSC 요율 (%)'), '99.99');
      await user.click(screen.getByLabelText('FSC 요율 저장'));

      await screen.findByRole('alert');

      expect(screen.getByLabelText('DHL FSC 요율 (%)')).toHaveValue(99.99);
      expect(screen.getByTestId('fsc-db-value-DHL')).toHaveTextContent('현재 DB: 22.22%');
    });

    it('does not pass off an unread table as "현재 DB" when the re-read fails', async () => {
      // `data` is seeded from rates.ts, so rendering it after a failed read would
      // present the CONSTANTS as the table's contents.
      mockUpdateFscRate.mockRejectedValue(new Error('socket hang up'));
      mockRetry.mockImplementation(() => {
        mockUseFscRates.mockReturnValue(hookResult({ error: 'FSC 요율 조회 실패' }));
      });

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.click(screen.getByLabelText('FSC 요율 저장'));
      await screen.findByRole('alert');

      await waitFor(() =>
        expect(screen.getByTestId('fsc-db-value-UPS')).toHaveTextContent(
          '현재 DB: 읽지 못했습니다',
        ),
      );
      expect(screen.getByTestId('fsc-db-value-UPS')).not.toHaveTextContent('11.11');
    });

    it('does not present a stale value as current while a re-read is in flight', async () => {
      mockUpdateFscRate.mockRejectedValue(new Error('socket hang up'));
      mockRetry.mockImplementation(() => {
        mockUseFscRates.mockReturnValue(hookResult({ loading: true, error: null }));
      });

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.click(screen.getByLabelText('FSC 요율 저장'));
      await screen.findByRole('alert');

      await waitFor(() =>
        expect(screen.getByTestId('fsc-db-value-UPS')).toHaveTextContent('현재 DB: 확인 중'),
      );
      expect(screen.getByTestId('fsc-db-value-UPS')).not.toHaveTextContent('11.11');
    });

    it('offers a re-read that keeps the typed values', async () => {
      mockUpdateFscRate.mockRejectedValue(new Error('socket hang up'));

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.clear(screen.getByLabelText('UPS FSC 요율 (%)'));
      await user.type(screen.getByLabelText('UPS FSC 요율 (%)'), '48.25');
      await user.click(screen.getByLabelText('FSC 요율 저장'));
      await screen.findByRole('alert');

      mockRetry.mockClear();
      await user.click(screen.getByLabelText('현재 DB 값 다시 읽기'));

      expect(mockRetry).toHaveBeenCalled();
      expect(screen.getByLabelText('UPS FSC 요율 (%)')).toHaveValue(48.25);
    });

    it('keeps the editor open so the partial write can be re-submitted', async () => {
      mockUpdateFscRate.mockRejectedValue(new Error('network down'));

      const user = userEvent.setup();
      render(<FscRateWidget />);

      await user.click(screen.getByLabelText('FSC 요율 편집'));
      await user.click(screen.getByLabelText('FSC 요율 저장'));
      await screen.findByRole('alert');

      expect(screen.getByLabelText('FSC 요율 저장')).toBeInTheDocument();
      expect(screen.getByLabelText('UPS FSC 요율 (%)')).toBeInTheDocument();
    });
  });

  it('raises no alert on a successful save', async () => {
    const user = userEvent.setup();
    render(<FscRateWidget />);

    await user.click(screen.getByLabelText('FSC 요율 편집'));
    await user.click(screen.getByLabelText('FSC 요율 저장'));

    await waitFor(() => expect(mockRetry).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a previous failure when the editor is reopened', async () => {
    mockUpdateFscRate.mockRejectedValue(new Error('network down'));

    const user = userEvent.setup();
    render(<FscRateWidget />);

    await user.click(screen.getByLabelText('FSC 요율 편집'));
    await user.click(screen.getByLabelText('FSC 요율 저장'));
    await screen.findByRole('alert');

    await user.click(screen.getByLabelText('FSC 요율 편집 취소'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers no edit control to a member', () => {
    render(<FscRateWidget readOnly />);

    expect(screen.queryByLabelText('FSC 요율 편집')).not.toBeInTheDocument();
  });
});
