'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/app/context/LocaleContext';

interface PaginationProps {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
    totalItems?: number;
    limit?: number;
    setLimit?: (limit: number) => void;
}

const DEFAULT_PAGE_SIZES = [12, 24, 48, 96];

function generatePageNumbers(current: number, total: number): number[] {
    if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
    
    let start = current - 1;
    let end = current + 1;
    
    if (current === 1) {
        start = 1;
        end = 3;
    } else if (current === total) {
        start = total - 2;
        end = total;
    }
    
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
}

export default function Pagination({ page, totalPages, setPage, totalItems = 0, limit = 12, setLimit }: PaginationProps) {
    const { t } = useLocale();
    const [sizeOpen, setSizeOpen] = useState(false);
    const sizeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setSizeOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (totalPages <= 1 && totalItems === 0) return null;

    const from = totalItems === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, totalItems);
    const pageNums = generatePageNumbers(page, totalPages);

    return (
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: info + page size */}
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                {/* Page size dropdown */}
                {setLimit && (
                    <div className="relative" ref={sizeRef}>
                        <button
                            onClick={() => setSizeOpen(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low text-sm font-semibold text-on-surface transition-all"
                            aria-label="Chọn số hàng hiển thị"
                        >
                            {limit}
                            <span className="material-symbols-outlined text-[14px] text-outline transition-transform duration-200" style={{ transform: sizeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                expand_more
                            </span>
                        </button>
                        {sizeOpen && (
                            <div className="absolute bottom-full left-0 mb-2 bg-surface rounded-2xl shadow-xl border border-outline-variant/10 py-1.5 min-w-[72px] z-50 animate-fade-in-up">
                                {DEFAULT_PAGE_SIZES.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => {
                                            setLimit(size);
                                            setPage(1); // Reset page to 1 when limit changes
                                            setSizeOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-surface-container transition-colors ${size === limit ? 'text-primary font-bold' : 'text-on-surface font-medium'}`}
                                    >
                                        <span>{size}</span>
                                        {size === limit && (
                                            <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: page navigation */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:border-primary/30 hover:text-primary transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>

                    {pageNums.map((p) => {
                        const isActive = p === page;
                        return (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md scale-105' : 'border border-outline-variant/20 text-on-surface hover:bg-surface-container hover:border-primary/30'}`}
                            >
                                {p}
                            </button>
                        );
                    })}

                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:border-primary/30 hover:text-primary transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
}
