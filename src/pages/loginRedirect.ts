// Where to send a user after a successful login.
//
// ProtectedRoute stashes the location it bounced the user away from in
// `state.from`. Honouring it means a session that expired on /admin lands back
// on /admin instead of always on /dashboard. The value comes from history
// state, so it is treated as untrusted: only an in-app absolute path is
// accepted ("//evil.com" is protocol-relative and would leave the app), and
// /login itself is never a destination.

export const DEFAULT_POST_LOGIN_PATH = '/dashboard';

interface LocationLike {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
}

interface LoginLocationState {
  from?: LocationLike;
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

export function resolvePostLoginPath(state: unknown): string {
  const from = (state as LoginLocationState | null | undefined)?.from;
  const pathname = asString(from?.pathname);

  if (!pathname.startsWith('/') || pathname.startsWith('//')) return DEFAULT_POST_LOGIN_PATH;
  if (pathname === '/login' || pathname.startsWith('/login/')) return DEFAULT_POST_LOGIN_PATH;

  return `${pathname}${asString(from?.search)}${asString(from?.hash)}`;
}

// "You've been signed out" travels in sessionStorage, not router state.
// React Router v7 runs navigations in a transition, and LoginPage is lazy: while
// its chunk loads, the old protected page stays mounted, sees `user` turn null,
// and its ProtectedRoute fires its own <Navigate to='/login' state={{ from }}>
// — which replaced a `signedOut` router state every time (caught by
// e2e/account-menu-logout.spec.ts). A one-shot flag doesn't care which
// redirect lands last. Storage can throw (privacy mode, blocked storage); the
// notice is a courtesy, so failures just mean no notice.
const SIGNED_OUT_FLAG = 'bl.auth.signedOut';

export function markSignedOut(): void {
  try {
    sessionStorage.setItem(SIGNED_OUT_FLAG, '1');
  } catch {
    // no notice
  }
}

export function hasSignedOutFlag(): boolean {
  try {
    return sessionStorage.getItem(SIGNED_OUT_FLAG) === '1';
  } catch {
    return false;
  }
}

export function clearSignedOutFlag(): void {
  try {
    sessionStorage.removeItem(SIGNED_OUT_FLAG);
  } catch {
    // nothing to clear
  }
}
