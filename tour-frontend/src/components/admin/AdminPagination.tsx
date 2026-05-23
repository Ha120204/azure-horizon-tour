'use client';

import { useEffect, useRef, useState } from 'react';

interface AdminPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    itemLabel?: string;
    pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [5, 10, 20, 50];

function generatePageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | '...')[] = [1];

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) pages.push(p);

    if (current < total - 2) pages.push('...');
    pages.push(total);

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
    const [jumpValue, setJumpValue] = useState('');
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
    const progress = totalPages > 1 ? Math.round((currentPage / totalPages) * 100) : 100;

    const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        const p = parseInt(jumpValue, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
            onPageChange(p);
        }
        setJumpValue('');
    };

    return (
        <div className="space-y-3">
            {/* ── Summary bar ── */}
            <div
                className="flex flex-wrap items-center justify-between gap-3 px-1"
            >
                {/* Left: record range info */}
                <div className="flex items-center gap-2.5 text-sm">
                    {/* Page-size picker */}
                    <div className="relative" ref={sizeRef}>
                        <button
                            onClick={() => setSizeOpen(v => !v)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-gray-700 transition-all"
                            aria-label="Chọn số hàng hiển thị"
                        >
                            {pageSize}
                            <span
                                className="material-symbols-outlined text-[13px] text-gray-400 transition-transform duration-200"
                                style={{ transform: sizeOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                            >
                                expand_more
                            </span>
                        </button>

                        {sizeOpen && (
                            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[110px] z-50">
                                {pageSizeOptions.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => { onPageSizeChange(size); setSizeOpen(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors hover:bg-blue-50 ${size === pageSize
                                            ? 'text-blue-600 font-bold'
                                            : 'text-gray-700 font-medium'
                                            }`}
                                    >
                                        <span>{size}</span>
                                        {size === pageSize && (
                                            <span className="material-symbols-outlined text-[15px] text-blue-600">check</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Record counter */}
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <span className="material-symbols-outlined text-[15px] text-gray-400">table_rows</span>
                        {totalItems === 0 ? (
                            <span>Không có dữ liệu</span>
                        ) : (
                            <span>
                                Hiển thị{' '}
                                <strong className="text-gray-800 tabular-nums">{from}–{to}</strong>
                                {' '}trong{' '}
                                <strong className="text-blue-600 tabular-nums">{totalItems.toLocaleString('vi-VN')}</strong>
                                {' '}{itemLabel}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: page progress */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                        Trang{' '}
                        <strong className="text-gray-700 tabular-nums">{currentPage}</strong>
                        {' '}/ {totalPages}

                        {/* Mini progress bar */}
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden ml-1">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, #1565C0, #2196F3)',
                                }}
                            />
                        </div>
                        <span className="tabular-nums text-blue-600 font-semibold">{progress}%</span>
                    </div>
                )}
            </div>

            {/* ── Navigation row ── */}
            {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Page buttons */}
                    <div className="flex items-center gap-1">
                        {/* First */}
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage <= 1}
                            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Trang đầu"
                            title="Trang đầu"
                        >
                            <span className="material-symbols-outlined text-[16px]">first_page</span>
                        </button>

                        {/* Prev */}
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Trang trước"
                        >
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {pageNums.map((p, idx) =>
                                p === '...' ? (
                                    <span
                                        key={`dots-${idx}`}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm select-none"
                                    >
                                        ···
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p as number)}
                                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all duration-200 ${p === currentPage
                                            ? 'text-white shadow-sm scale-105'
                                            : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                        style={
                                            p === currentPage
                                                ? { background: 'linear-gradient(135deg, #1565C0, #2196F3)' }
                                                : {}
                                        }
                                        aria-label={`Trang ${p}`}
                                        aria-current={p === currentPage ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Trang sau"
                        >
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>

                        {/* Last */}
                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage >= totalPages}
                            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Trang cuối"
                            title="Trang cuối"
                        >
                            <span className="material-symbols-outlined text-[16px]">last_page</span>
                        </button>
                    </div>

                    {/* Jump to page */}
                    {totalPages > 5 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Đến trang</span>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={jumpValue}
                                onChange={e => setJumpValue(e.target.value)}
                                onKeyDown={handleJump}
                                placeholder="…"
                                className="w-14 h-8 rounded-xl border border-gray-200 text-center text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label="Nhảy đến trang"
                            />
                            <button
                                onClick={() => {
                                    const p = parseInt(jumpValue, 10);
                                    if (!isNaN(p) && p >= 1 && p <= totalPages) onPageChange(p);
                                    setJumpValue('');
                                }}
                                className="h-8 px-3 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg, #1565C0, #2196F3)' }}
                            >
                                Đi
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
