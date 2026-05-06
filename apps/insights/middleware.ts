import { NextRequest, NextResponse } from 'next/server';
import { fetchSessionUser } from './lib/auth/rails-session';

const PRODUCTION_ORIGIN = 'https://bridgelogis.com';

function loginRedirectOrigin(req: NextRequest): string {
  // Production 은 항상 메인 도메인. preview/development 는 요청 origin 그대로.
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_ORIGIN;
  return req.nextUrl.origin;
}

export async function middleware(req: NextRequest) {
  // basePath '/insights' 는 Next.js 미들웨어에서 자동 제거되어 pathname 은 '/admin/...'.
  // matcher 가 '/admin/:path*' 로 잡으므로 본 핸들러는 admin 영역에서만 실행됨.
  const returnTo = `/insights${req.nextUrl.pathname}${req.nextUrl.search}`;

  const user = await fetchSessionUser(req);

  if (!user) {
    const loginUrl = new URL('/login', loginRedirectOrigin(req));
    loginUrl.searchParams.set('redirect', returnTo);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', loginRedirectOrigin(req)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
