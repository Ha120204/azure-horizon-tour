'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { clearClientUserStorage } from '@/lib/authSession';
import { getSafeRedirectPath } from '@/lib/authRedirect';

/**
 * Trang callback sau Google OAuth.
 *
 * Backend redirect về đây sau khi xác thực Google thành công, kèm:
 * - Cookie accessToken / refreshToken đã được set (HttpOnly)
 * - Query params: name, avatar (thông tin user để lưu localStorage)
 *
 * Trang này:
 * 1. Đọc thông tin user từ query params
 * 2. Cập nhật localStorage (userName, userAvatar)
 * 3. Dispatch 'auth-change' để Header cập nhật UI
 * 4. Redirect về trang đích
 */
function AuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const name = searchParams.get('name') || '';
        const avatar = searchParams.get('avatar') || '';
        const error = searchParams.get('error');
        const redirectTarget = getSafeRedirectPath(searchParams.get('redirect'));

        if (error) {
            // Google OAuth thất bại — redirect về login với thông báo
            router.replace(`/login?error=${encodeURIComponent(error)}`);
            return;
        }

        // Cập nhật localStorage (dữ liệu hiển thị tạm thời trên Header)
        clearClientUserStorage();
        if (name) localStorage.setItem('userName', name);
        if (avatar) {
            localStorage.setItem('userAvatar', avatar);
        } else {
            localStorage.removeItem('userAvatar');
        }

        // Phát sự kiện để Header cập nhật trạng thái đăng nhập
        window.dispatchEvent(new Event('auth-change'));

        // Redirect về trang đích (hoặc trang chủ)
        if (redirectTarget) {
            window.location.assign(redirectTarget);
        } else {
            router.replace('/');
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="flex flex-col items-center gap-4">
                <span
                    className="material-symbols-outlined text-5xl text-primary animate-spin"
                    aria-hidden="true"
                >
                    progress_activity
                </span>
                <p className="text-on-surface-variant font-medium">
                    Đang đăng nhập...
                </p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-surface">
                    <span className="material-symbols-outlined text-5xl text-primary animate-spin">
                        progress_activity
                    </span>
                </div>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}
