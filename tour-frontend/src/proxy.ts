import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'STAFF']);

// Decode JWT payload without verification — optimistic role check only.
// Real authorization still happens on the backend for every API call.
function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as unknown;
    if (payload && typeof payload === 'object' && 'role' in payload) {
      return typeof (payload as { role: unknown }).role === 'string'
        ? (payload as { role: string }).role
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard localized admin paths: /(vi|en)/admin/...  (skip /admin/login)
  const adminMatch = /^\/(vi|en)(\/admin(?:\/|$))/.exec(pathname);
  if (adminMatch) {
    const adminSubPath = adminMatch[2]; // "/admin", "/admin/dashboard", etc.
    const isLoginPage =
      adminSubPath === '/admin/login' || adminSubPath.startsWith('/admin/login/');

    if (!isLoginPage) {
      const locale = adminMatch[1];
      const token = request.cookies.get('accessToken')?.value;

      if (!token) {
        return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
      }

      const role = decodeJwtRole(token);
      if (!ADMIN_ROLES.has(role ?? '')) {
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Bắt mọi route ngoại trừ static files (hình ảnh, _next) và các routes API
  matcher: ['/', '/(vi|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
