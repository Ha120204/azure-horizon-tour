'use client';

import type React from 'react';

interface TourPageHeaderProps {
    isStaff: boolean;
    onExportCSV: () => void;
    onCreate: () => void;
}

export function TourPageHeader({ isStaff, onExportCSV, onCreate }: TourPageHeaderProps) {
    return (
        <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
            <div>
                <h1 className="font-headline text-[1.75rem] font-semibold text-on-surface" style={{ textWrap: 'balance' } as React.CSSProperties}>
                    Quản Lý Tour
                </h1>
                <p className="text-on-surface-variant text-sm mt-1">Quản lý và giám sát toàn bộ danh sách tour của Azure&nbsp;Horizon.</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onExportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-on-surface-variant text-sm font-semibold hover:bg-surface-container hover:text-on-surface transition-all shadow-sm"
                    title="Xuất danh sách tour ra file CSV"
                >
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">download</span>
                    Xuất CSV
                </button>
                <button
                    onClick={onCreate}
                    aria-label={isStaff ? 'Tạo bản nháp tour' : 'Tạo tour hoặc bản nháp'}
                    className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">{isStaff ? 'draft' : 'add'}</span>
                    {isStaff ? 'Tạo bản nháp' : 'Tạo Tour / Nháp'}
                </button>
            </div>
        </div>
    );
}
