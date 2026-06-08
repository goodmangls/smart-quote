import { describe, expect, it } from 'vitest';
import { getQuoteAccessFlags } from '../quoteAccess';

describe('getQuoteAccessFlags', () => {
  it('treats Korean account owner user role as non-admin quote UX with Korean currency toggle', () => {
    expect(getQuoteAccessFlags({ role: 'user', nationality: 'Korea' }, false)).toEqual({
      isAdmin: false,
      hideMargin: true,
      isKorean: true,
    });
  });

  it('keeps admin route behavior with visible margin and Korean admin currency defaults', () => {
    expect(getQuoteAccessFlags({ role: 'admin', nationality: 'KR' }, false)).toEqual({
      isAdmin: true,
      hideMargin: false,
      isKorean: true,
    });
  });

  it('keeps non-Korean member margin hidden without Korean toggle', () => {
    expect(getQuoteAccessFlags({ role: 'member', nationality: 'US' }, false)).toEqual({
      isAdmin: false,
      hideMargin: true,
      isKorean: false,
    });
  });
});
