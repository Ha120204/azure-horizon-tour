'use client';

import type { TourTab } from '../_lib/types';

interface TourTabsProps {
    activeTab: TourTab;
    activeCount: number;
    trashCount: number;
    onTabChange: (tab: TourTab) => void;
}

export function TourTabs({ activeTab, activeCount, trashCount, onTabChange }: TourTabsProps) {
    return (
        <div className="flex items-center gap-1 mb-6 bg-surface-container-lowest rounded-2xl p-1 border border-outline-variant/10 shadow-sm w-fit">
            <button
                onClick={() => onTabChange('active')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'active'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
            >
                <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                Đang quản lý
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                    {activeCount}
                </span>
            </button>
            <button
                onClick={() => onTabChange('trash')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'trash'
                    ? 'bg-error text-on-error shadow-sm'
                    : 'text-on-surface-variant hover:bg-error/5 hover:text-error'
                    }`}
            >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Thùng rác
                {trashCount > 0 && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'trash' ? 'bg-white/20 text-white' : 'bg-error/10 text-error'}`}>
                        {trashCount}
                    </span>
                )}
            </button>
        </div>
    );
}
