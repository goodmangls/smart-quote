/**
 * Login redirect open redirect 방어.
 *
 * 메인 SPA `/login?redirect=...` 쿼리 파라미터는 외부 URL/스킴 공격 표면이다.
 * 화이트리스트 prefix 에 해당하는 같은-origin path 만 허용하고, 절대 URL,
 * protocol-relative URL, javascript:/data:/vbscript: 등 위험 스킴은 모두 차단.
 *
 * apps/insights middleware 가 비로그인 사용자를 `/login?redirect=/insights/admin`
 * 으로 보내는 흐름과 직접 연결된다.
 */

const ALLOWED_PREFIXES = [
  '/insights',
  '/dashboard',
  '/quote',
  '/admin',
  '/schedule',
  '/guide',
  '/history',
  '/notice',
];

export function resolveLoginRedirect(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;

  // 절대 URL (https://, http://) 또는 위험 스킴 (javascript:, data:, vbscript:) 차단.
  // RFC 3986: scheme starts with letter and contains [a-z0-9+\-.] — `:` 가 포함되면
  // path-only 가 아닐 가능성이 높다.
  if (/^[a-z][a-z0-9+\-.]*:/i.test(input)) return null;

  // protocol-relative URL (`//evil.com`).
  if (input.startsWith('//')) return null;

  // backslash-prefix (Windows path traversal 방어).
  if (input.startsWith('\\')) return null;

  // 같은-origin path 는 단일 슬래시로 시작.
  if (!input.startsWith('/')) return null;

  // 화이트리스트 boundary 검증 — `/insights` 는 OK 이지만 `/insightsabc` 는 차단.
  const matchesPrefix = ALLOWED_PREFIXES.some((prefix) => {
    if (input === prefix) return true;
    const next = input[prefix.length];
    return input.startsWith(prefix) && (next === '/' || next === '?' || next === '#');
  });

  return matchesPrefix ? input : null;
}
