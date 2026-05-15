import {
  QuoteInput,
  QuoteResult,
  QuoteDetail,
  QuoteListResponse,
  QuoteListParams,
  CostBreakdown,
  QuoteStatus,
} from '@/types';
import { request, ApiError, API_URL, AUTH_EXPIRED_EVENT } from './apiClient';
import { clearAllTokens, getAccessToken } from '@/lib/authStorage';
import * as Sentry from '@sentry/browser';
import { quoteInputSchema } from '@/lib/schemas/quoteInput.schema';
import { quoteListParamsSchema } from '@/lib/schemas/quoteListParams.schema';
import { zodErrorToString } from '@/lib/schemas/zodError';

export { ApiError as QuoteApiError };

// Runtime input validation — fails fast with a user-friendly message
// before hitting the network. See docs/02-design/.../smart-quote-input-validation.
function assertValidQuoteInput(input: QuoteInput): void {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) {
    const msg = zodErrorToString(parsed.error);
    Sentry.captureMessage(`Invalid QuoteInput: ${msg}`, 'warning');
    throw new Error(`입력 검증 실패: ${msg}`);
  }
}

function assertValidListParams(params: QuoteListParams): void {
  const parsed = quoteListParamsSchema.safeParse(params);
  if (!parsed.success) {
    const msg = zodErrorToString(parsed.error);
    Sentry.captureMessage(`Invalid QuoteListParams: ${msg}`, 'warning');
    throw new Error(`조회 조건 검증 실패: ${msg}`);
  }
}

// Maps backend breakdown fields (upsBase) to frontend generic names (intlBase).
// Handles both old saved quotes and future field names.
interface RawBreakdown {
  packingMaterial?: number;
  packingLabor?: number;
  packingFumigation?: number;
  handlingFees?: number;
  pickupInSeoul?: number;
  intlBase?: number;
  upsBase?: number;
  intlFsc?: number;
  upsFsc?: number;
  intlWarRisk?: number;
  upsWarRisk?: number;
  intlSurge?: number;
  upsSurge?: number;
  destDuty?: number;
  totalCost?: number;
}

export function mapBreakdown(raw: RawBreakdown): CostBreakdown {
  return {
    packingMaterial: raw.packingMaterial ?? 0,
    packingLabor: raw.packingLabor ?? 0,
    packingFumigation: raw.packingFumigation ?? 0,
    handlingFees: raw.handlingFees ?? 0,
    pickupInSeoul: raw.pickupInSeoul ?? 0,
    intlBase: raw.intlBase ?? raw.upsBase ?? 0,
    intlFsc: raw.intlFsc ?? raw.upsFsc ?? 0,
    intlWarRisk: raw.intlWarRisk ?? raw.upsWarRisk ?? 0,
    intlSurge: raw.intlSurge ?? raw.upsSurge ?? 0,
    destDuty: raw.destDuty ?? 0,
    totalCost: raw.totalCost ?? 0,
  };
}

// ── Existing: stateless calculation ──

export const fetchQuote = async (input: QuoteInput): Promise<QuoteResult> => {
  assertValidQuoteInput(input);
  const raw = await request<QuoteResult & { breakdown: RawBreakdown }>('/api/v1/quotes/calculate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { ...raw, breakdown: mapBreakdown(raw.breakdown) };
};

// ── Quote History CRUD ──

export const saveQuote = async (input: QuoteInput, notes?: string): Promise<QuoteDetail> => {
  assertValidQuoteInput(input);
  // Send only input fields — backend recalculates result via QuoteCalculator
  return request<QuoteDetail>('/api/v1/quotes', {
    method: 'POST',
    body: JSON.stringify({ ...input, notes }),
  });
};

export const listQuotes = async (params: QuoteListParams = {}): Promise<QuoteListResponse> => {
  assertValidListParams(params);
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.perPage != null) searchParams.set('per_page', String(params.perPage));
  if (params.q) searchParams.set('q', params.q);
  if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.status) searchParams.set('status', params.status);
  if (params.minAmount != null) searchParams.set('min_amount', String(params.minAmount));
  if (params.maxAmount != null) searchParams.set('max_amount', String(params.maxAmount));
  if (params.amountCurrency) searchParams.set('amount_currency', params.amountCurrency);

  const qs = searchParams.toString();
  return request<QuoteListResponse>(`/api/v1/quotes${qs ? `?${qs}` : ''}`);
};

export const getQuote = async (id: number): Promise<QuoteDetail> => {
  const raw = await request<QuoteDetail & { breakdown: RawBreakdown }>(`/api/v1/quotes/${id}`);
  return { ...raw, breakdown: mapBreakdown(raw.breakdown) };
};

export const updateQuoteStatus = async (
  id: number,
  status: QuoteStatus,
  notes?: string,
): Promise<QuoteDetail> => {
  const raw = await request<QuoteDetail & { breakdown: RawBreakdown }>(`/api/v1/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
  });
  return { ...raw, breakdown: mapBreakdown(raw.breakdown) };
};

export const sendQuoteEmail = async (
  id: number,
  recipientEmail: string,
  recipientName?: string,
  message?: string,
): Promise<{ success: boolean; message: string }> => {
  return request<{ success: boolean; message: string }>(`/api/v1/quotes/${id}/send_email`, {
    method: 'POST',
    body: JSON.stringify({ recipientEmail, recipientName, message }),
  });
};

export const deleteQuote = async (id: number): Promise<void> => {
  return request<void>(`/api/v1/quotes/${id}`, { method: 'DELETE' });
};

export const exportQuotes = async (
  params: QuoteListParams = {},
  format: 'csv' | 'xlsx' = 'csv',
): Promise<void> => {
  assertValidListParams(params);
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.status) searchParams.set('status', params.status);
  if (params.minAmount != null) searchParams.set('min_amount', String(params.minAmount));
  if (params.maxAmount != null) searchParams.set('max_amount', String(params.maxAmount));
  if (params.amountCurrency) searchParams.set('amount_currency', params.amountCurrency);

  const qs = searchParams.toString();
  const token = getAccessToken();
  const accept =
    format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';
  const headers: HeadersInit = { Accept: accept };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${API_URL}/api/v1/quotes/export.${format}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      clearAllTokens();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      throw new ApiError(response.status, 'Session expired');
    }
    if (response.status === 403) {
      throw new ApiError(response.status, 'Access denied');
    }
    if (response.status === 422) {
      const body = await response.json().catch(() => null);
      throw new ApiError(response.status, body?.error?.message ?? 'Invalid filter');
    }
    if (response.status >= 500) {
      throw new ApiError(response.status, 'Server error');
    }
    throw new ApiError(response.status, `Failed to export ${format.toUpperCase()}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `quotes-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

// Backward-compat alias (deprecated — prefer exportQuotes).
export const exportQuotesCsv = (params: QuoteListParams = {}): Promise<void> =>
  exportQuotes(params, 'csv');
