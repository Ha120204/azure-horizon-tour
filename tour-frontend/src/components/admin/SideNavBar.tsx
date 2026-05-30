'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { canAccessRole, getCleanAdminPath, type AdminRole } from '@/lib/adminAccess';
import React, { useState } from 'react';

type NavItem = {
    href: string;
    icon: string;
    label: string;
    roles: AdminRole[];
    section: 'super' | 'operations' | 'governance';
};

const navItems: NavItem[] = [
    { href: '/admin/super',      icon: 'admin_panel_settings', label: 'Tổng quan cấp cao', roles: ['SUPER_ADMIN'], section: 'super' },
    { href: '/admin/staffs',     icon: 'manage_accounts',      label: 'Quản lý Admin', roles: ['SUPER_ADMIN'], section: 'super' },
    { href: '/admin/logs',       icon: 'history',              label: 'Nhật ký hành động', roles: ['SUPER_ADMIN'], section: 'super' },
    { href: '/admin/settings',   icon: 'settings',             label: 'Cấu hình hệ thống', roles: ['SUPER_ADMIN'], section: 'super' },

    { href: '/admin',            icon: 'dashboard',            label: 'Tổng quan', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },
    { href: '/admin/statistics', icon: 'bar_chart',            label: 'Thống kê', roles: ['SUPER_ADMIN', 'ADMIN'], section: 'operations' },
    { href: '/admin/tours',      icon: 'explore',              label: 'Quản lý Tour', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },
    { href: '/admin/bookings',   icon: 'event_note',           label: 'Đơn đặt', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },
    { href: '/admin/customers',  icon: 'group',                label: 'Khách hàng', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },
    { href: '/admin/vouchers',   icon: 'confirmation_number',  label: 'Mã giảm giá', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },
    { href: '/admin/marketing',  icon: 'campaign',             label: 'Tiếp thị', roles: ['SUPER_ADMIN', 'ADMIN'], section: 'operations' },
    { href: '/admin/articles',   icon: 'article',              label: 'Bài viết', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },
    { href: '/admin/reviews',    icon: 'reviews',              label: 'Đánh giá', roles: ['SUPER_ADMIN', 'ADMIN'], section: 'operations' },
    { href: '/admin/support',    icon: 'support_agent',        label: 'Hỗ trợ', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'], section: 'operations' },

    { href: '/admin/staffs',     icon: 'badge',                label: 'Nhân viên', roles: ['ADMIN'], section: 'governance' },
    { href: '/admin/logs',       icon: 'history',              label: 'Nhật ký', roles: ['ADMIN'], section: 'governance' },
    { href: '/admin/settings',   icon: 'settings',             label: 'Cài đặt', roles: ['ADMIN'], section: 'governance' },
];

const SECTION_LABEL: Record<NavItem['section'], string> = {
    super: 'Siêu quản trị',
    operations: 'Vận hành',
    governance: 'Quản trị',
};

type SideNavBarProps = {
    currentUserRole?: AdminRole | '';
};

export default function SideNavBar({ currentUserRole: authenticatedRole = '' }: SideNavBarProps) {
    const pathname = usePathname();
    const [currentUserRole, setCurrentUserRole] = useState<string>(authenticatedRole);

    React.useEffect(() => {
        if (authenticatedRole) {
            setCurrentUserRole(authenticatedRole);
        }
    }, [authenticatedRole]);

    React.useEffect(() => {
        const applyLocalRole = () => {
            const savedRole = localStorage.getItem('userRole') || '';
            if (savedRole) setCurrentUserRole(savedRole);
        };

        const loadProfile = async () => {
            if (!authenticatedRole) applyLocalRole();
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
                if (!res.ok) return;
                const data = await res.json();
                const profile = data.data ?? data;
                const role = profile.role || '';
                setCurrentUserRole(role);
                if (profile.fullName) localStorage.setItem('userName', profile.fullName);
                if (role) localStorage.setItem('userRole', role);
                if (profile.email) localStorage.setItem('userEmail', profile.email);
                if (profile.avatarUrl) localStorage.setItem('userAvatarUrl', profile.avatarUrl);
                else localStorage.removeItem('userAvatarUrl');
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        const handleAuthChange = () => {
            void loadProfile();
        };

        void loadProfile();
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, [authenticatedRole]);

    const isActive = (href: string) => {
        const cleanPath = getCleanAdminPath(pathname);
        if (href === '/admin') return cleanPath === '/admin';
        return cleanPath.startsWith(href);
    };

    const visibleItems = navItems.filter(item => canAccessRole(currentUserRole, item.roles));
    const sections = (['super', 'operations', 'governance'] as const)
        .map(section => ({
            section,
            items: visibleItems.filter(item => item.section === section),
        }))
        .filter(group => group.items.length > 0);

    return (
        <aside
            className="h-screen w-64 fixed left-0 top-0 bg-[#060e24] border-r border-white/5 shadow-[4px_0_32px_rgba(0,0,0,0.5)] flex flex-col z-50 font-body transition-all"
            aria-label="Sidebar Navigation"
        >
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-6 h-20 flex-shrink-0 border-b border-white/5">
                <div className="w-8 h-8 rounded-xl bg-sky-400 flex items-center justify-center shadow-lg shadow-sky-400/30">
                    <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-headline text-lg font-bold text-white tracking-tight leading-none mb-0.5">Azure Horizon</span>
                    <span className="text-[10px] font-bold text-sky-300/60 uppercase tracking-[0.15em] leading-none mt-0.5">Admin Console</span>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto w-full px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {sections.map(group => (
                    <div key={group.section} className="space-y-1">
                        <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300/40">
                            {SECTION_LABEL[group.section]}
                        </p>
                        {group.items.map((item) => {
                            const active = isActive(item.href);
                            const isSuperItem = item.section === 'super';
                            return (
                                <Link
                                    key={`${item.section}-${item.href}`}
                                    href={item.href}
                                    className={`group relative flex items-center px-3.5 py-2.5 rounded-xl gap-3.5 transition-all duration-200 outline-none focus-visible:ring-2 ${
                                        active
                                            ? isSuperItem
                                                ? 'bg-amber-400/20 text-amber-200 border border-amber-400/25 focus-visible:ring-amber-400'
                                                : 'bg-sky-400/20 text-white border border-sky-400/25 focus-visible:ring-sky-400'
                                            : 'text-slate-400 border border-transparent hover:bg-white/[0.07] hover:text-white focus-visible:ring-sky-400'
                                    }`}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    <span
                                        className={`material-symbols-outlined text-[20px] transition-all duration-200 flex-shrink-0 ${
                                            active
                                                ? isSuperItem ? 'text-amber-300' : 'text-sky-300'
                                                : 'text-slate-500 group-hover:text-white'
                                        }`}
                                        aria-hidden="true"
                                        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className={`font-semibold text-sm tracking-wide ${
                                        active ? isSuperItem ? 'text-amber-200' : 'text-white' : ''
                                    }`}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

        </aside>
    );
}
