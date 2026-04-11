/**
 * fetchWithAuth — Utility tập trung gọi API có xác thực.
 *
 * Tự động:
 * 1. Gắn Authorization header với access token
 * 2. Nếu nhận 401 → dùng refresh token xin access token mới
 * 3. Retry lại request ban đầu với token mới
 * 4. Nếu refresh cũng thất bại → xóa token, redirect về /login
 */

const API_BASE = 'http://localhost:3000';

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken');

  // Gắn Authorization header
  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Gọi request ban đầu
  let response = await fetch(url, { ...options, headers });

  // Nếu 401 Unauthorized → thử refresh token
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      // Không có refresh token → buộc đăng nhập lại
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userName');
      window.location.href = '/login';
      return response;
    }

    try {
      // Gọi endpoint refresh
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();

        // Lưu access token mới
        localStorage.setItem('accessToken', data.access_token);

        // Retry request ban đầu với token mới
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${data.access_token}`);
        response = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        // Refresh token cũng hết hạn → buộc đăng nhập lại
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Lỗi khi refresh token:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userName');
      window.location.href = '/login';
    }
  }

  return response;
}
