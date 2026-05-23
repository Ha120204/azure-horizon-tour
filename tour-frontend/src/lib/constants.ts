/**
 * Constants — Hằng số dùng chung trong toàn bộ frontend.
 * Đặt NEXT_PUBLIC_API_URL trong .env.local để override khi deploy.
 */

/** Base URL của backend API */
export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
