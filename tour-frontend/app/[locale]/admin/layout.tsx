'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import SideNavBar from '@/app/components/admin/SideNavBar';
import TopAppBar from '@/app/components/admin/TopAppBar';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

    // Kiểm tra xem đường dẫn hiện tại có phải trang login admin không
    const isLoginPage = pathname?.replace(/^\/(en|vi)/, '').startsWith('/admin/login');

    useEffect(() => {
        // Nếu đang ở trang login admin → bỏ qua kiểm tra xác thực, để trang login tự xử lý
        if (isLoginPage) {
            setAuthState('authorized');
            return;
        }

        const checkAccess = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setAuthState('unauthorized');
                router.replace('/admin/login');
                return;
            }

            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
                if (!res.ok) {
                    setAuthState('unauthorized');
                    router.replace('/admin/login');
                    return;
                }

                const user = await res.json();
                const role = user.role || user.data?.role;

                if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
                    setAuthState('unauthorized');
                    router.replace('/');
                    return;
                }

                setAuthState('authorized');
            } catch {
                setAuthState('unauthorized');
                router.replace('/admin/login');
            }
        };

        checkAccess();
    }, [router, isLoginPage]);

    // Loading state — hiển thị khi đang kiểm tra quyền
    if (authState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#060B18]">
                <div className="flex flex-col items-center gap-5">
                    {/* Logo + spinner */}
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                explore
                            </span>
                        </div>
                        {/* Spinner ring */}
                        <span className="absolute -inset-1.5 rounded-2xl border-2 border-blue-500/30 border-t-blue-400 animate-spin" style={{ borderRadius: '18px' }} />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <p className="text-slate-200 text-sm font-semibold">Azure Horizon</p>
                        <p className="text-slate-500 text-xs">Đang xác thực quyền truy cập...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Unauthorized — sẽ redirect, hiển thị blank tạm
    if (authState === 'unauthorized') {
        return null;
    }

    // Nếu đang ở trang login → render full-screen không có sidebar/topbar
    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="bg-surface text-on-surface font-body antialiased min-h-screen flex w-full">
            <SideNavBar />
            <div className="flex-1 ml-64 flex flex-col min-h-screen relative">
                <TopAppBar />
                {children}
            </div>
        </div>
    );
}
