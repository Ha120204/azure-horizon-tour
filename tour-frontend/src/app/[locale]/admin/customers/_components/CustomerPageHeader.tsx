import type { CSSProperties } from 'react';

interface CustomerPageHeaderProps {
    hasFreshData: boolean;
    lastSyncedAt: Date | null;
    onRefresh: () => void | Promise<void>;
}

export function CustomerPageHeader({ hasFreshData, lastSyncedAt, onRefresh }: CustomerPageHeaderProps) {
    return (
        <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
            <div>
                <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as CSSProperties}>
                    Quản lý Khách Hàng
                </h1>
                <p className="text-on-surface-variant text-sm mt-1">Theo dõi và quản lý tài khoản khách hàng đã đăng ký trên hệ thống.</p>
            </div>
            <div className="flex items-center gap-3">
                {hasFreshData && (
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <span className="material-symbols-outlined text-[18px]">fiber_new</span>
                        Có khách hàng mới
                    </button>
                )}
                {lastSyncedAt && !hasFreshData && (
                    <span className="hidden xl:inline text-xs font-medium text-on-surface-variant">
                        Cập nhật {lastSyncedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Làm mới
                </button>
            </div>
        </div>
    );
}
