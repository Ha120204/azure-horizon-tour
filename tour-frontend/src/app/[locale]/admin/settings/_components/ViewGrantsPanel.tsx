'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/http/fetchWithAuth';
import { toastEmitter } from '@/lib/http/toastEmitter';
import { SUPER_ADMIN_AREAS, type SuperAdminArea } from '@/lib/admin/adminAccess';

const AREA_META: Record<SuperAdminArea, { label: string; icon: string }> = {
    statistics: { label: 'Thống kê', icon: 'bar_chart' },
    tours: { label: 'Quản lý Tour', icon: 'explore' },
    bookings: { label: 'Đơn đặt', icon: 'event_note' },
    customers: { label: 'Khách hàng', icon: 'group' },
    vouchers: { label: 'Mã giảm giá', icon: 'confirmation_number' },
    marketing: { label: 'Tiếp thị', icon: 'campaign' },
    articles: { label: 'Bài viết', icon: 'article' },
    reviews: { label: 'Đánh giá', icon: 'reviews' },
    support: { label: 'Hỗ trợ', icon: 'support_agent' },
};

export default function ViewGrantsPanel() {
    const [grants, setGrants] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingArea, setSavingArea] = useState<SuperAdminArea | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await api.get<{ grants: string[] }>('/admin/super/view-grants');
                if (result.ok) setGrants(result.data?.grants ?? []);
            } finally {
                setIsLoading(false);
            }
        };
        void load();
    }, []);

    const toggleArea = async (area: SuperAdminArea) => {
        if (savingArea) return;
        const next = grants.includes(area)
            ? grants.filter((g) => g !== area)
            : [...grants, area];
        setSavingArea(area);
        try {
            const result = await api.patch<{ grants: string[] }>('/admin/super/view-grants', { grants: next });
            if (!result.ok) {
                toastEmitter.error('Không thể cập nhật quyền xem');
                return;
            }
            setGrants(result.data?.grants ?? next);
            // Báo SideNavBar nạp lại profile để cập nhật menu ngay
            window.dispatchEvent(new Event('auth-change'));
            toastEmitter.success(
                next.includes(area)
                    ? `Đã bật quyền xem ${AREA_META[area].label}`
                    : `Đã tắt quyền xem ${AREA_META[area].label}`,
            );
        } catch {
            toastEmitter.error('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setSavingArea(null);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                </div>
                <div>
                    <h2 className="font-headline text-lg font-bold text-slate-800">Quyền xem khu vận hành</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Bật để xem (chỉ đọc) các khu vận hành. Mọi thay đổi được ghi vào nhật ký hệ thống.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <p className="text-sm text-slate-400">Đang tải...</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {SUPER_ADMIN_AREAS.map((area) => {
                        const enabled = grants.includes(area);
                        const saving = savingArea === area;
                        return (
                            <button
                                key={area}
                                type="button"
                                onClick={() => { void toggleArea(area); }}
                                disabled={saving}
                                aria-pressed={enabled}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                                    enabled
                                        ? 'border-emerald-200 bg-emerald-50'
                                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                }`}
                            >
                                <span className="flex items-center gap-2.5 min-w-0">
                                    <span className={`material-symbols-outlined text-[20px] ${enabled ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true">
                                        {AREA_META[area].icon}
                                    </span>
                                    <span className={`truncate text-sm font-semibold ${enabled ? 'text-emerald-800' : 'text-slate-600'}`}>
                                        {AREA_META[area].label}
                                    </span>
                                </span>
                                <span
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                                        enabled ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
