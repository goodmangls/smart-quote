export interface ExpiryInfo {
  daysLeft: number;
  expired: boolean;
  severity: 'expired' | 'soon' | 'ok';
}

/**
 * 견적 유효기간 만료일 정보 계산.
 *
 * severity 분기:
 * - expired:  daysLeft <= 0
 * - soon:     1 <= daysLeft <= 3
 * - ok:       daysLeft >= 4
 *
 * 기존 QuoteHistoryTable inline 로직(getExpiryFromDate + 표시 시 3색 분기)을
 * 단일 함수로 통합. 다른 features 에서 재사용하지 않는다 (history scope).
 */
export function getExpiryInfo(validityDate: string): ExpiryInfo {
  const expiry = new Date(validityDate);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysLeft <= 0;
  const severity: ExpiryInfo['severity'] = expired ? 'expired' : daysLeft <= 3 ? 'soon' : 'ok';
  return { daysLeft, expired, severity };
}
