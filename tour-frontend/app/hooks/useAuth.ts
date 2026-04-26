/**
 * useAuth — Custom hook quản lý authentication state.
 *
 * Cung cấp các tiện ích:
 * - Kiểm tra trạng thái đăng nhập
 * - Lấy thông tin user từ localStorage
 * - Đăng xuất
 */

'use client';

import { useCallback } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';

export function useAuth() {
    /** Kiểm tra user đã đăng nhập chưa */
    const isLoggedIn = (): boolean => {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('accessToken');
    };

    /** Lấy access token */
    const getToken = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    };

    /** Lấy tên user */
    const getUserName = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('userName');
    };

    /** Đăng xuất: xóa token, gọi API logout, phát event */
    const logout = useCallback(async () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userName');

        // Gọi API logout để xóa HttpOnly cookie
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch {
            // Ignore network errors during logout
        }

        // Phát event để Header cập nhật
        window.dispatchEvent(new Event('auth-change'));
    }, []);

    return {
        isLoggedIn,
        getToken,
        getUserName,
        logout,
    };
}
