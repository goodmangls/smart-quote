import * as Sentry from '@sentry/browser';
import { request } from '@/api/apiClient';

/**
 * Asks the backend to post a Slack alert for a saved quote.
 *
 * Only the reference number is sent — the backend builds the message from the
 * stored quote and owns the webhook URL. Client-built text would let any user
 * post arbitrary content into the company channel.
 */
export const sendQuoteSlackNotification = async (referenceNo: string): Promise<void> => {
  try {
    await request('/api/v1/notifications/slack', {
      method: 'POST',
      body: JSON.stringify({ referenceNo }),
    });
  } catch (e) {
    // Slack notification is best-effort; never block the save flow
    Sentry.captureException(e);
  }
};
