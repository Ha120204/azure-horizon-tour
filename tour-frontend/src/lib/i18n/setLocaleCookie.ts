// next-intl đọc locale từ cookie NEXT_LOCALE cho các path KHÔNG có prefix (locale mặc định 'vi').
// Khi đổi sang locale mặc định chỉ bằng soft-navigation, next-intl không tự ghi đè cookie →
// cookie cũ (vd 'en') khiến middleware redirect mọi link không prefix (/login, /destinations…)
// sang /en/... Ghi cookie thủ công để cookie luôn khớp ngôn ngữ đang chọn.
export function setLocaleCookie(locale: 'vi' | 'en') {
  if (typeof document === 'undefined') return;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

// Đổi ngôn ngữ = full-page navigation xác định, ghi cookie ĐÚNG MỘT LẦN.
// KHÔNG dùng router.replace({locale}) + router.refresh(): hai thao tác đó đua nhau (messages
// nằm ở layout [locale] dùng chung không được refetch khi soft-nav), và router.replace còn
// khiến next-intl ghi NEXT_LOCALE lần hai với path khác → trình duyệt giữ 2 cookie, proxy đọc
// nhầm rồi bật ngược locale. Tải lại trang đảm bảo messages luôn đúng ngôn ngữ, không nhấp nháy.
//
// Tự đọc path + query từ window.location (client-only) nên không phụ thuộc hook nào,
// giữ nguyên toàn bộ query hiện tại (?tourId=, ?redirect=…).
export function changeLocale(nextLocale: 'vi' | 'en') {
  if (typeof window === 'undefined') return;
  setLocaleCookie(nextLocale);

  const { pathname, search } = window.location;
  const pathWithoutLocale = pathname.replace(/^\/(en|vi)(?=\/|$)/, '') || '/';

  // 'vi' là defaultLocale (localePrefix 'as-needed') nên KHÔNG có tiền tố; 'en' luôn có '/en'.
  const base = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
  const prefix = nextLocale === 'en' ? '/en' : '';
  const target = `${prefix}${base}` || '/';

  window.location.assign(`${target}${search}`);
}
