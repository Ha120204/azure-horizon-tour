const SUPPORTED_LOCALES = new Set(['en', 'vi']);

export function getSafeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;

  const redirectPath = value.trim();
  if (!redirectPath.startsWith('/') || redirectPath.startsWith('//')) return null;

  try {
    const url = new URL(redirectPath, 'http://localhost');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildLocalizedLoginPath(locale: string, redirectPath: string): string {
  const safeLocale = SUPPORTED_LOCALES.has(locale) ? locale : 'en';
  return `/${safeLocale}/login?redirect=${encodeURIComponent(redirectPath)}`;
}
