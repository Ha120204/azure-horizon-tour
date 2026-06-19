import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'vi'],
  defaultLocale: 'vi',
  localePrefix: 'as-needed',
  // Ghim path '/' cho cookie locale. Mặc định next-intl tự suy path và hiểu nhầm tiền tố
  // locale (vd '/en') thành basePath → ghi cookie với path=/en. Khi đó chuyển EN→VI, cookie
  // mới không áp cho '/destinations' nên middleware đọc cookie cũ (en) rồi redirect ngược lại.
  localeCookie: { path: '/' },
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
