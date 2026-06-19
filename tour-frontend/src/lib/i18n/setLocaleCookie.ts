// next-intl đọc locale từ cookie NEXT_LOCALE cho các path KHÔNG có prefix (locale mặc định 'vi').
// Khi đổi sang locale mặc định chỉ bằng soft-navigation, next-intl không tự ghi đè cookie →
// cookie cũ (vd 'en') khiến middleware redirect mọi link không prefix (/login, /destinations…)
// sang /en/... Ghi cookie thủ công để cookie luôn khớp ngôn ngữ đang chọn.
export function setLocaleCookie(locale: 'vi' | 'en') {
  if (typeof document === 'undefined') return;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
