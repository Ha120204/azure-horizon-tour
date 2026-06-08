import { API_BASE_URL } from './constants';
import { clearClientUserStorage, refreshAuthSession } from '../auth/authSession';
import { toastEmitter } from './toastEmitter';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiOk<T> = { ok: true; data: T; status: number };
export type ApiErr = { ok: false; error: string; status: number };
export type ApiResult<T> = ApiOk<T> | ApiErr;

// ─── Constants ────────────────────────────────────────────────────────────────

const SILENT_PATHS: RegExp[] = [
  /\/auth\/refresh/,
  /\/auth\/profile/,
  /\/auth\/logout/,
];

function isSilentPath(url: string): boolean {
  return SILENT_PATHS.some((pattern) => pattern.test(url));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isBrowser() {
  return typeof window !== 'undefined';
}

function getLoginPath(): string {
  if (!isBrowser()) return '/login';
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/(vi|en)(?=\/|$)/);
  const locale = match ? match[1] : 'vi';

  const pathWithoutLocale = pathname.replace(/^\/(en|vi)(?=\/|$)/, '') || '/';
  const baseLogin = pathWithoutLocale.startsWith('/admin') ? '/admin/login' : '/login';
  return `/${locale}${baseLogin}`;
}

async function logoutAndRedirect(): Promise<void> {
  clearClientUserStorage();
  if (isBrowser()) {
    window.dispatchEvent(new Event('auth-change'));
  }
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
  if (isBrowser()) {
    window.location.href = getLoginPath();
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().json();
    const msg = body?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    return body?.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function handleErrorToast(status: number, message: string, url: string): void {
  if (isSilentPath(url)) return;

  switch (true) {
    case status === 403:
      toastEmitter.error('Không có quyền truy cập', message || 'Bạn không được phép thực hiện thao tác này.');
      break;
    case status >= 500:
      toastEmitter.error('Lỗi máy chủ', message || 'Đã xảy ra lỗi phía máy chủ. Vui lòng thử lại sau.');
      break;
    case status === 422:
      toastEmitter.error('Dữ liệu không hợp lệ', message);
      break;
    case status === 404:
      break;
    case status === 400:
      break;
    default:
      break;
  }
}

// ─── Core fetch engine ────────────────────────────────────────────────────────

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers ?? {});

  let response = await fetch(url, { cache: 'no-store', ...options, credentials: 'include', headers });

  if (response.status !== 401) {
    return response;
  }

  // 401: thử refresh token một lần
  try {
    const refreshed = await refreshAuthSession();
    if (!refreshed) {
      await logoutAndRedirect();
      return response;
    }
    const retryHeaders = new Headers(options.headers ?? {});
    response = await fetch(url, { cache: 'no-store', ...options, credentials: 'include', headers: retryHeaders });
  } catch {
    await logoutAndRedirect();
  }

  return response;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
  opts: {
    silent?: boolean;
    baseUrl?: string;
  } = {},
): Promise<ApiResult<T>> {
  const url = `${opts.baseUrl ?? API_BASE_URL}${path}`;
  const silent = opts.silent ?? false;

  const headers = new Headers(options.headers ?? {});
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetchWithAuth(url, { ...options, headers });
  } catch {
    const networkError = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    if (!silent && !isSilentPath(url)) {
      toastEmitter.error('Lỗi kết nối', networkError);
    }
    return { ok: false, error: networkError, status: 0 };
  }

  if (response.ok) {
    try {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = (await response.json()) as { data?: T } | T;
        const data =
          payload !== null &&
          typeof payload === 'object' &&
          'data' in (payload as object)
            ? (payload as { data: T }).data
            : (payload as T);
        return { ok: true, data, status: response.status };
      }
      return { ok: true, data: response as unknown as T, status: response.status };
    } catch {
      return { ok: true, data: undefined as unknown as T, status: response.status };
    }
  }

  const errorMessage = await extractErrorMessage(response);

  if (!silent) {
    handleErrorToast(response.status, errorMessage, url);
  }

  return { ok: false, error: errorMessage, status: response.status };
}

export const api = {
  get: <T = unknown>(path: string, opts?: Parameters<typeof apiClient>[2]) =>
    apiClient<T>(path, { method: 'GET' }, opts),

  post: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Parameters<typeof apiClient>[2],
  ) =>
    apiClient<T>(
      path,
      {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: { 'Content-Type': 'application/json' },
      },
      opts,
    ),

  patch: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Parameters<typeof apiClient>[2],
  ) =>
    apiClient<T>(
      path,
      {
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: { 'Content-Type': 'application/json' },
      },
      opts,
    ),

  put: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Parameters<typeof apiClient>[2],
  ) =>
    apiClient<T>(
      path,
      {
        method: 'PUT',
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: { 'Content-Type': 'application/json' },
      },
      opts,
    ),

  delete: <T = unknown>(path: string, opts?: Parameters<typeof apiClient>[2]) =>
    apiClient<T>(path, { method: 'DELETE' }, opts),
};
