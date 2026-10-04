import {
  DEFAULT_POST_LOGIN_PATH,
  clearSignedOutFlag,
  hasSignedOutFlag,
  markSignedOut,
  resolvePostLoginPath,
} from '../loginRedirect';

describe('resolvePostLoginPath', () => {
  it('returns the page ProtectedRoute bounced the user from, with query and hash', () => {
    expect(
      resolvePostLoginPath({ from: { pathname: '/admin', search: '?tab=fsc', hash: '#rates' } }),
    ).toBe('/admin?tab=fsc#rates');
  });

  it.each([
    ['no state', undefined],
    ['null state', null],
    ['state without from', { signedOut: true }],
    ['non-string pathname', { from: { pathname: 42 } }],
    ['relative path', { from: { pathname: 'admin' } }],
    ['protocol-relative URL', { from: { pathname: '//evil.example/phish' } }],
    ['absolute URL', { from: { pathname: 'https://evil.example' } }],
    ['the login page itself', { from: { pathname: '/login' } }],
  ])('falls back to the dashboard for %s', (_label, state) => {
    expect(resolvePostLoginPath(state)).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});

describe('signed-out flag', () => {
  beforeEach(() => sessionStorage.clear());

  it('is set by markSignedOut and gone after clearSignedOutFlag', () => {
    expect(hasSignedOutFlag()).toBe(false);
    markSignedOut();
    expect(hasSignedOutFlag()).toBe(true);
    clearSignedOutFlag();
    expect(hasSignedOutFlag()).toBe(false);
  });

  it('treats unavailable storage as "no notice" instead of throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasSignedOutFlag()).toBe(false);
    spy.mockRestore();
  });
});
