'use client';

import { useEffect, useRef, useState } from 'react';

interface AdminPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    itemLabel?: string; // vd: "tour", "bài viết", "khách hàng"
    pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [5, 10, 20, 50];

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

export default function AdminPagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    itemLabel = 'mục',
    pageSizeOptions = DEFAULT_PAGE_SIZES,
}: AdminPaginationProps) {
    const [sizeOpen, setSizeOpen] = useState(false);
    const sizeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setSizeOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);
    const pageNums = generatePageNumbers(currentPage, totalPages);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
            {/* Left: info + page size */}
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                {/* Page size dropdown */}
                <div className="relative" ref={sizeRef}>
                    <button
                        onClick={() => setSizeOpen(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:border-primary/30 hover:bg-surface-container text-sm font-semibold text-on-surface transition-all"
                        aria-label="Chọn số hàng hiển thị"
                    >
                        {pageSize}
                        <span className="material-symbols-outlined text-[14px] text-outline transition-transform duration-200" style={{ transform: sizeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                        </span>
                    </button>
                    {sizeOpen && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-outline-variant/10 py-1.5 min-w-[72px] z-50 animate-fade-in-up">
                            {pageSizeOptions.map(size => (
                                <button
                                    key={size}
                                    onClick={() => { onPageSizeChange(size); setSizeOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-surface-container transition-colors ${size === pageSize ? 'text-primary font-bold' : 'text-on-surface font-medium'}`}
                                >
                                    <span>{size}</span>
                                    {size === pageSize && (
                                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: page navigation */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    {/* Prev */}
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="w-8 h-8 rounded-xl border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="Trang trước"
                    >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>

                    {/* Page numbers */}
                    {pageNums.map((p) => (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all duration-200 ${p === currentPage
                                    ? 'bg-primary text-on-primary shadow-sm scale-105'
                                    : 'border border-outline-variant/20 text-on-surface hover:bg-surface-container hover:border-primary/30'
                                    }`}
                                aria-label={`Trang ${p}`}
                                aria-current={p === currentPage ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        )
                    )}

                    {/* Next */}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="w-8 h-8 rounded-xl border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="Trang sau"
                    >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
}
