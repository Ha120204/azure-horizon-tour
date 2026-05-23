'use client';

import { useState } from 'react';
import { getTranslatedVoucher } from '@/lib/dev/mockTranslations';

interface Voucher {
    id: number;
    code: string;
    label: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minOrderValue: number;
    expiresAt: string;
}

interface VoucherCarouselProps {
    vouchers: Voucher[];
    copiedCode: string | null;
    savedIds: Set<number>;
    savingId: number | null;
    onCopy: (code: string) => void;
    onSave: (voucherId: number) => void;
    isModalOpen: boolean;
    setIsModalOpen: (v: boolean) => void;
    t: (key: string, params?: Record<string, any>) => string;
    formatPrice: (price: number) => string;
    language: string;
}

// ── Rotating accent colors ──
const ACCENT_STYLES = [
    { accent: 'bg-primary',             text: 'text-white',  discount: 'text-secondary-fixed',    btnPrimary: 'bg-white/15 hover:bg-white/25 text-white border border-white/25', btnSecondary: 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15' },
    { accent: 'bg-secondary-container', text: 'text-white',  discount: 'text-on-secondary-fixed', btnPrimary: 'bg-white/15 hover:bg-white/25 text-white border border-white/25', btnSecondary: 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15' },
    { accent: 'bg-slate-800',           text: 'text-white',  discount: 'text-amber-300',          btnPrimary: 'bg-white/15 hover:bg-white/25 text-white border border-white/25', btnSecondary: 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15' },
    { accent: 'bg-emerald-700',         text: 'text-white',  discount: 'text-emerald-100',        btnPrimary: 'bg-white/15 hover:bg-white/25 text-white border border-white/25', btnSecondary: 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15' },
];

// ── Single Ticket Card (horizontal layout) ──
function TicketCard({ v: originalVoucher, idx, copiedCode, savedIds, savingId, onCopy, onSave, t, formatPrice, language, compact }: {
    v: Voucher; idx: number; copiedCode: string | null; savedIds: Set<number>; savingId: number | null;
    onCopy: (code: string) => void; onSave: (id: number) => void;
    t: (key: string, params?: Record<string, any>) => string; formatPrice: (price: number) => string; language: string; compact?: boolean;
}) {
    const v = getTranslatedVoucher(originalVoucher, language);
    const s = ACCENT_STYLES[idx % ACCENT_STYLES.length];
    const isCopied = copiedCode === v.code;
    const isSaved = savedIds.has(v.id);
    const isSaving = savingId === v.id;

    const discountDisplay = v.discountType === 'PERCENTAGE'
        ? `${v.discountValue}% ${t('off')}`
        : `${t('save')} ${formatPrice(v.discountValue)}`;

    const expiryDate = new Date(v.expiresAt).toLocaleDateString(
        language === 'vi' ? 'vi-VN' : 'en-US',
        { day: '2-digit', month: 'short', year: 'numeric' }
    );

    return (
        <div
            className={`group relative flex rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${s.accent} ${s.text}`}
            style={{ minHeight: compact ? '140px' : '164px' }}
        >
            {/* ══ Left: Discount Info ══ */}
            <div className={`flex-[7] ${compact ? 'p-4' : 'p-5 md:p-6'} flex flex-col justify-between relative`}>
                <div>
                    <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold tracking-[0.2em] uppercase opacity-75 mb-1`}>
                        {v.label}
                    </p>
                    <h3 className={`${compact ? 'text-xl' : 'text-2xl md:text-3xl'} font-headline font-black leading-tight mb-1.5 ${s.discount}`}>
                        {discountDisplay}
                    </h3>
                    <p className={`${compact ? 'text-[11px]' : 'text-xs'} opacity-85 leading-relaxed line-clamp-2 max-w-[300px]`}>
                        {v.description}
                    </p>
                </div>
                <div className={`flex items-center gap-3 ${compact ? 'text-[9px] mt-2' : 'text-[10px] mt-3'} opacity-60 font-medium`}>
                    <span className="flex items-center gap-1">
                        <span className={`material-symbols-outlined ${compact ? 'text-[10px]' : 'text-[12px]'}`}>calendar_month</span>
                        {t('expires')} {expiryDate}
                    </span>
                    <span>·</span>
                    <span>{t('minOrder')} {formatPrice(v.minOrderValue)}</span>
                </div>
            </div>

            {/* ══ Dashed separator with punch holes ══ */}
            <div className="relative flex items-center justify-center w-0">
                <div className="absolute -top-3 w-6 h-6 rounded-full bg-surface z-10"></div>
                <div className="absolute top-6 bottom-6 w-px border-l border-dashed opacity-30"></div>
                <div className="absolute -bottom-3 w-6 h-6 rounded-full bg-surface z-10"></div>
            </div>

            {/* ══ Right: Code + Actions ══ */}
            <div className={`flex-[3] ${compact ? 'p-4' : 'p-5 md:p-6'} flex flex-col items-center justify-center gap-2.5 min-w-[150px]`}>
                <div className="text-center">
                    <p className="text-[9px] uppercase tracking-[0.2em] opacity-50 mb-0.5">{t('couponCode')}</p>
                    <p className={`font-mono font-black ${compact ? 'text-sm' : 'text-base md:text-lg'} tracking-wider`}>{v.code}</p>
                </div>
                <button
                    onClick={() => onCopy(v.code)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${isCopied ? 'bg-emerald-400/30 text-emerald-100' : s.btnPrimary}`}
                >
                    <span className="material-symbols-outlined text-[14px]">{isCopied ? 'check' : 'content_copy'}</span>
                    {isCopied ? t('copied') : t('copy')}
                </button>
                <button
                    onClick={() => onSave(v.id)}
                    disabled={isSaved || isSaving}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${isSaved ? 'bg-emerald-400/25 text-emerald-100 cursor-default' : s.btnSecondary} ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                >
                    <span className="material-symbols-outlined text-[14px]">
                        {isSaved ? 'check_circle' : isSaving ? 'progress_activity' : 'wallet'}
                    </span>
                    {isSaved ? t('savedToWallet') : isSaving ? t('saving') : t('saveToWallet')}
                </button>
            </div>
        </div>
    );
}

// ── Main Component ──
export default function VoucherCarousel({
    vouchers, copiedCode, savedIds, savingId, onCopy, onSave, isModalOpen, setIsModalOpen, t, formatPrice, language,
}: VoucherCarouselProps) {
    const INITIAL_COUNT = 4;
    const MODAL_PAGE_SIZE = 6;
    const [modalPage, setModalPage] = useState(1);

    const displayedVouchers = vouchers.slice(0, INITIAL_COUNT);
    const hasMore = vouchers.length > INITIAL_COUNT;

    // Modal pagination
    const totalPages = Math.ceil(vouchers.length / MODAL_PAGE_SIZE);
    const modalVouchers = vouchers.slice(
        (modalPage - 1) * MODAL_PAGE_SIZE,
        modalPage * MODAL_PAGE_SIZE
    );

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalPage(1);
    };

    return (
        <>
            <section className="py-16 md:py-20 px-6 md:px-8 max-w-screen-xl mx-auto">
                {/* ── Section Header ── */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-xl">confirmation_number</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary">{t('memberVouchers')}</h2>
                        </div>
                        <p className="text-on-surface-variant text-sm md:text-base ml-[52px]">{t('memberVouchersDesc')}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full">
                        <span className="material-symbols-outlined text-primary text-sm">redeem</span>
                        <span className="text-sm font-bold text-primary">{vouchers.length} {language === 'vi' ? 'mã giảm giá' : 'vouchers'}</span>
                    </div>
                </div>

                {/* ── Voucher Grid (2 columns desktop, 1 mobile) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {displayedVouchers.map((v, idx) => (
                        <div
                            key={v.id}
                            className="animate-fade-slide-up"
                            style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
                        >
                            <TicketCard
                                v={v} idx={idx} copiedCode={copiedCode} savedIds={savedIds}
                                savingId={savingId} onCopy={onCopy} onSave={onSave}
                                t={t} formatPrice={formatPrice} language={language}
                            />
                        </div>
                    ))}
                </div>

                {/* ── View All Button ── */}
                {hasMore && (
                    <div className="mt-10 flex justify-center">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full border-2 border-primary/20 text-primary text-sm font-bold hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">grid_view</span>
                            {language === 'vi' ? `Xem tất cả ${vouchers.length} voucher` : `View All ${vouchers.length} Vouchers`}
                            <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:translate-x-1">
                                arrow_forward
                            </span>
                        </button>
                    </div>
                )}
            </section>

            {/* ══════════ All Vouchers Modal with Pagination ══════════ */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-surface rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 md:p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest shrink-0">
                            <div>
                                <h2 className="text-xl font-headline font-bold text-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">confirmation_number</span>
                                    {t('allVouchersTitle')}
                                </h2>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {language === 'vi'
                                        ? `Hiển thị ${(modalPage - 1) * MODAL_PAGE_SIZE + 1}–${Math.min(modalPage * MODAL_PAGE_SIZE, vouchers.length)} / ${vouchers.length} voucher`
                                        : `Showing ${(modalPage - 1) * MODAL_PAGE_SIZE + 1}–${Math.min(modalPage * MODAL_PAGE_SIZE, vouchers.length)} of ${vouchers.length} vouchers`
                                    }
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors text-on-surface-variant"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Modal Body – Scrollable voucher list */}
                        <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-4 scrollbar-hide">
                            {modalVouchers.map((v, idx) => (
                                <TicketCard
                                    key={v.id}
                                    v={v}
                                    idx={(modalPage - 1) * MODAL_PAGE_SIZE + idx}
                                    copiedCode={copiedCode}
                                    savedIds={savedIds}
                                    savingId={savingId}
                                    onCopy={onCopy}
                                    onSave={onSave}
                                    t={t}
                                    formatPrice={formatPrice}
                                    language={language}
                                    compact
                                />
                            ))}
                        </div>

                        {/* Modal Footer – Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 md:p-5 border-t border-outline-variant/20 flex items-center justify-center gap-2 bg-surface-container-lowest shrink-0">
                                {/* Previous */}
                                <button
                                    onClick={() => setModalPage(p => Math.max(1, p - 1))}
                                    disabled={modalPage === 1}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 text-primary"
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>

                                {/* Page numbers */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setModalPage(page)}
                                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                                            page === modalPage
                                                ? 'bg-primary text-white shadow-md'
                                                : 'text-on-surface-variant hover:bg-primary/10'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                {/* Next */}
                                <button
                                    onClick={() => setModalPage(p => Math.min(totalPages, p + 1))}
                                    disabled={modalPage === totalPages}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 text-primary"
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
