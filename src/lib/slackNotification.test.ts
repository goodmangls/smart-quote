const { request, captureException } = vi.hoisted(() => ({
  request: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@/api/apiClient', () => ({ request }));
vi.mock('@sentry/browser', () => ({ captureException }));

import { sendQuoteSlackNotification } from './slackNotification';

describe('sendQuoteSlackNotification', () => {
  beforeEach(() => {
    request.mockReset();
    captureException.mockReset();
  });

  it('sends only the reference number — the backend builds the message', async () => {
    request.mockResolvedValue({ delivered: true, duplicate: false });

    await sendQuoteSlackNotification('SQ-2026-0042');

    expect(request).toHaveBeenCalledTimes(1);
    const [path, options] = request.mock.calls[0];
    expect(path).toBe('/api/v1/notifications/slack');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ referenceNo: 'SQ-2026-0042' });
  });

  it('reports failures to Sentry instead of throwing into the save flow', async () => {
    const failure = new Error('503 SLACK_NOT_CONFIGURED');
    request.mockRejectedValue(failure);

    await expect(sendQuoteSlackNotification('SQ-2026-0042')).resolves.toBeUndefined();
    expect(captureException).toHaveBeenCalledWith(failure);
  });
});
