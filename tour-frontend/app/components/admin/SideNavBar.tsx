'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { API_BASE_URL } from '@/app/lib/constants';
import React, { useState } from 'react';

const navItems = [
    { href: '/admin',            icon: 'dashboard',            label: 'Tổng quan' },
    { href: '/admin/statistics', icon: 'bar_chart',            label: 'Thống kê' },
    { href: '/admin/tours',      icon: 'explore',              label: 'Quản lý Tour' },
    { href: '/admin/bookings',   icon: 'event_note',           label: 'Đơn đặt' },
    { href: '/admin/customers',  icon: 'group',                label: 'Khách hàng' },
    { href: '/admin/staffs',     icon: 'badge',                label: 'Nhân viên' },
    { href: '/admin/vouchers',   icon: 'confirmation_number',  label: 'Mã giảm giá' },
    { href: '/admin/articles',   icon: 'article',              label: 'Bài viết' },
    { href: '/admin/reviews',    icon: 'reviews',              label: 'Đánh giá' },
    { href: '/admin/logs',       icon: 'history',              label: 'Nhật ký' },
];


const ROLE_LABEL: Record<string, { label: string; color: string }> = {
    SUPER_ADMIN: { label: 'Siêu Quản Trị', color: 'text-amber-400' },
    ADMIN:       { label: 'Quản Trị Viên', color: 'text-blue-400' },
    STAFF:       { label: 'Nhân Viên',     color: 'text-teal-400' },
};

export default function SideNavBar() {
    const pathname = usePathname();
    const router = useRouter();
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [adminName, setAdminName] = useState<string>('Admin');
    const [adminInitials, setAdminInitials] = useState<string>('A');

    React.useEffect(() => {
        // Đọc từ localStorage trước để hiển thị ngay (không chờ API)
        const savedName = localStorage.getItem('userName') || '';
        if (savedName) {
            setAdminName(savedName);
            const parts = savedName.trim().split(' ');
            setAdminInitials(
                parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : savedName.slice(0, 2).toUpperCase()
            );
        }
        // Lấy role từ API (chỉ gọi 1 lần khi mount sidebar)
        fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
        .then(res => res.json())
        .then(data => {
            const profile = data.data ?? data;
            const role = profile.role || '';
            const fullName = profile.fullName || savedName || 'Admin';
            setCurrentUserRole(role);
            setAdminName(fullName);
            const parts = fullName.trim().split(' ');
            setAdminInitials(
                parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : fullName.slice(0, 2).toUpperCase()
            );
        })
        .catch(err => console.error('Error fetching profile:', err));
    }, []);

    const handleLogout = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userName');
            window.dispatchEvent(new Event('auth-change'));
            router.replace('/admin/login');
        }
    };

    const isActive = (href: string) => {
        const cleanPath = pathname?.replace(/^\/(en|vi)/, '') || '';
        if (href === '/admin') return cleanPath === '/admin';
        return cleanPath.startsWith(href);
    };

    return (
        <aside className="h-screen w-64 fixed left-0 top-0 bg-[#0A0F1C] border-r border-white/5 flex flex-col z-50 font-body transition-all" aria-label="Sidebar Navigation">
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-6 h-20 flex-shrink-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-headline text-lg font-bold text-white tracking-tight leading-none mb-0.5">Azure Horizon</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none mt-0.5">Admin Console</span>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto w-full px-4 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {navItems.filter(item => {
                    // Ẩn menu Nhân viên nếu role là STAFF
                    if (item.href === '/admin/staffs' && currentUserRole === 'STAFF') {
                        return false;
                    }
                    return true;
                }).map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center px-4 py-3 rounded-xl gap-4 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                active
                                    ? 'bg-blue-600/15 text-blue-400 shadow-inner'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`}
                            aria-current={active ? 'page' : undefined}
                        >
                            <span 
                                className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} 
                                aria-hidden="true"
                                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                                {item.icon}
                            </span>
                            <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 flex-shrink-0 mb-2">
                <div
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    tabIndex={0}
                    role="button"
                    aria-haspopup="menu"
                    aria-label="Cài đặt hồ sơ người dùng"
                    onClick={() => router.push('/admin/profile' as any)}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center text-white shadow-md ring-2 ring-transparent group-hover:ring-white/20 transition-all overflow-hidden flex-shrink-0">
                        <span className="text-sm font-bold tracking-wider">{adminInitials}</span>
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">{adminName}</span>
                        <span className={`text-[10px] font-bold tracking-wider uppercase mt-0.5 truncate ${ROLE_LABEL[currentUserRole]?.color ?? 'text-slate-400'}`}>
                            {ROLE_LABEL[currentUserRole]?.label ?? currentUserRole}
                        </span>
                    </div>
                    <button
                        aria-label="Đăng xuất"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-error"
                        onClick={(e) => { e.stopPropagation(); handleLogout(e); }}
                    >
                        <span className="material-symbols-outlined text-[20px] translate-x-0.5" aria-hidden="true">logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
