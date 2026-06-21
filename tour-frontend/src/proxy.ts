import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Đường dẫn đã có tiền tố locale (/en/... hoặc /vi/...) — URL luôn thắng cookie.
const HAS_LOCALE_PREFIX = /^\/(en|vi)(\/|$)/;

// Auth gating cho /admin được xử lý ở admin layout (client) + backend trên mỗi API call.
// Không gate ở proxy vì cookie accessToken nằm trên domain backend, không gửi tới domain FE
// (production khác domain) → proxy không đọc được cookie và sẽ redirect nhầm vô hạn.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Khu admin CHỈ tiếng Việt: gỡ mọi tiền tố locale (/en/admin, /vi/admin) về /admin.
  // language của admin bám theo segment URL (next-intl), nên ép URL không tiền tố là đủ
  // để mọi định dạng ngày/tiền và context đều ở tiếng Việt.
  const prefixedAdmin = pathname.match(/^\/(?:en|vi)(\/admin(?:\/.*)?)$/);
  if (prefixedAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = prefixedAdmin[1];
    return NextResponse.redirect(url);
  }
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');

  // GIỮ ngôn ngữ đã chọn: routing đặt localeDetection:false nên next-intl bỏ qua cookie,
  // khiến mọi link không có tiền tố luôn trả về 'vi'. Ta tự khôi phục phần "nhớ lựa chọn":
  //  - Khách đã chọn 'en' (cookie NEXT_LOCALE=en) → đưa về /en để link thường không rớt về 'vi'.
  //  - Khách mới (không cookie) hoặc đã chọn 'vi' → giữ mặc định tiếng Việt, KHÔNG dò Accept-Language.
  //  - KHÔNG áp dụng cho /admin (admin không hỗ trợ tiếng Anh).
  // URL có sẵn tiền tố thì tôn trọng URL (link chia sẻ /en/... vẫn ra tiếng Anh).
  if (!HAS_LOCALE_PREFIX.test(pathname)) {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    if (cookieLocale === 'en' && !isAdminPath) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? '/en' : `/en${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  // Bắt mọi route ngoại trừ static files (hình ảnh, _next) và các routes API
  matcher: ['/', '/(vi|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
