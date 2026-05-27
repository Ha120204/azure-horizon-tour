import { API_BASE_URL } from './constants';

const AUTH_STORAGE_KEYS = [
  'accessToken',
  'userName',
  'userEmail',
  'userRole',
  'userAvatarUrl',
  'userAvatar',
];

function isBrowser() {
  return typeof window !== 'undefined';
}

function clearAuthStorage() {
  if (!isBrowser()) return;

  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event('auth-change'));
}

function getLoginPath() {
  if (!isBrowser()) return '/login';

  const pathWithoutLocale = window.location.pathname.replace(/^\/(en|vi)(?=\/|$)/, '') || '/';
  return pathWithoutLocale.startsWith('/admin') ? '/admin/login' : '/login';
}

async function logoutAndRedirect() {
  clearAuthStorage();
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});

  if (isBrowser()) {
    window.location.href = getLoginPath();
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = isBrowser() ? localStorage.getItem('accessToken') : null;
  const headers = new Headers(options.headers || {});

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status !== 401) {
    return response;
  }

  try {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!refreshRes.ok) {
      await logoutAndRedirect();
      return response;
    }

    const payload = await refreshRes.json();
    const data = payload.data || payload;
    const nextAccessToken = data.access_token || data.accessToken;

    if (!nextAccessToken) {
      await logoutAndRedirect();
      return response;
    }

    if (isBrowser()) {
      localStorage.setItem('accessToken', nextAccessToken);
    }

    const retryHeaders = new Headers(options.headers || {});
    retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);
    response = await fetch(url, { ...options, headers: retryHeaders });
  } catch {
    console.error('Failed to refresh access token');
    await logoutAndRedirect();
  }

  return response;
}
