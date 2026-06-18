import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Auth gating cho /admin được xử lý ở admin layout (client) + backend trên mỗi API call.
// Không gate ở proxy vì cookie accessToken nằm trên domain backend, không gửi tới domain FE
// (production khác domain) → proxy không đọc được cookie và sẽ redirect nhầm vô hạn.
export default createMiddleware(routing);

export const config = {
  // Bắt mọi route ngoại trừ static files (hình ảnh, _next) và các routes API
  matcher: ['/', '/(vi|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
