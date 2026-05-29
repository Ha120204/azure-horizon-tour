import { API_BASE_URL } from './constants';

export type AuthProfile = {
  id?: number;
  userId?: number;
  email?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  identityType?: string | null;
  identityNo?: string | null;
};

const CLIENT_USER_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'userName',
  'userEmail',
  'userRole',
  'userAvatarUrl',
  'userAvatar',
];

function isBrowser() {
  return typeof window !== 'undefined';
}

export function clearClientUserStorage() {
  if (!isBrowser()) return;
  CLIENT_USER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export async function refreshAuthSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchOptionalAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    credentials: 'include',
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAuthSession();
  if (!refreshed) {
    return response;
  }

  return fetch(url, {
    cache: 'no-store',
    ...options,
    credentials: 'include',
  });
}

export async function fetchAuthProfile(): Promise<AuthProfile | null> {
  try {
    const response = await fetchOptionalAuth(`${API_BASE_URL}/auth/profile`);
    if (!response.ok) return null;

    const payload = await response.json();
    return (payload.data ?? payload) as AuthProfile;
  } catch (error) {
    console.error("Lỗi fetchAuthProfile:", error);
    return null;
  }
}
