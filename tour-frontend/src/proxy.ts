import createMiddleware from 'next-intl/middleware';
import {routing} from '@/i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Bắt mọi route ngoại trừ static files (hình ảnh, _next) và các routes API
  matcher: ['/', '/(vi|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
