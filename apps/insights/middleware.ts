import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from './lib/auth/supabase-server';

const PRODUCTION_ORIGIN = 'https://bridgelogis.com';

function loginRedirectOrigin(req: NextRequest): string {
  // Production 은 항상 메인 도메인. preview/development 는 요청 origin 그대로.
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_ORIGIN;
  return req.nextUrl.origin;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // basePath '/insights' 는 Next.js 미들웨어에서 자동 제거되어 pathname 은 '/admin/...'.
  // matcher 가 '/admin/:path*' 로 잡으므로 본 핸들러는 admin 영역에서만 실행됨.
  const returnTo = `/insights${req.nextUrl.pathname}${req.nextUrl.search}`;

  if (!user) {
    const loginUrl = new URL('/login', loginRedirectOrigin(req));
    loginUrl.searchParams.set('redirect', returnTo);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== 'admin') {
    return NextResponse.redirect(new URL('/', loginRedirectOrigin(req)));
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
