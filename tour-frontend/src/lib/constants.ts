/**
 * Constants — Hằng số dùng chung trong toàn bộ frontend.
 * Đặt NEXT_PUBLIC_API_URL trong .env.local để override khi deploy.
 */

/** Base URL của backend API */
const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function resolveApiBaseUrl() {
    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

    if (!configuredApiUrl && process.env.NODE_ENV === 'production') {
        throw new Error('NEXT_PUBLIC_API_URL is required in production builds.');
    }

    return (configuredApiUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
