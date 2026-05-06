import type { NextRequest } from 'next/server';

export interface SessionUser {
  id: number | string;
  email: string;
  role: string;
}

const SESSION_COOKIE_NAME = 'bl_session';

/**
 * Rails JWT cookie (`bl_session`) 으로부터 세션 사용자 조회.
 *
 * D1=B 결정에 따라 middleware 가 cookie 를 받아 Rails `/api/v1/auth/me` 로
 * 검증을 위임한다. role 변경 즉시 반영 + secret 한 곳 운영.
 *
 * - cookie 미존재 → null (fetch 호출 0)
 * - 401/4xx/5xx → null
 * - network 오류 → null
 * - role 필드 없음 → null (방어)
 *
 * OI-5: controller 응답이 평면(`{ email, role }`) 또는 wrapped(`{ user: {...} }`)
 * 양쪽 모두 처리한다.
 */
export async function fetchSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;

  const apiUrl = process.env.RAILS_API_URL;
  if (!apiUrl) {
    throw new Error('RAILS_API_URL not configured');
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${cookie.value}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const body = (await res.json()) as Record<string, unknown>;
    const userPayload = (body.user as Record<string, unknown>) ?? body;

    const id = userPayload.id as number | string | undefined;
    const email = userPayload.email as string | undefined;
    const role = userPayload.role as string | undefined;

    if (id === undefined || email === undefined || role === undefined) {
      return null;
    }

    return { id, email, role };
  } catch {
    return null;
  }
}

export const __TEST__ = { SESSION_COOKIE_NAME };
