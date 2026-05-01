import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Login Redirect',
  robots: { index: false, follow: false },
};

interface AdminLoginPageProps {
  searchParams: { redirect?: string };
}

// Fallback: 미들웨어가 미인증 사용자를 메인 SPA /login 으로 직접 보내지만,
// 누군가 /insights/admin/login 을 직접 방문하면 본 페이지가 메인 SPA 로 안내.
export default function AdminLoginRedirectPage({
  searchParams,
}: AdminLoginPageProps) {
  const target = searchParams.redirect ?? '/insights/admin';
  const productionLogin = `https://bridgelogis.com/login?redirect=${encodeURIComponent(target)}`;
  redirect(productionLogin);
}
