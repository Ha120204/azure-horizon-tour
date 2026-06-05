'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { type BookingDetail, type BankOption, type PaymentIssueForm } from '../_lib/types';

function createEmptyForm(): PaymentIssueForm {
    return { amount: '', transferredAt: '', transactionRef: '', senderBank: '', senderAccountName: '', note: '' };
}

function parseMoneyInput(value: string) {
    const normalized = value.replace(/[^\d]/g, '');
    return normalized ? Number(normalized) : 0;
}

type Props = {
    booking: BookingDetail;
    banksList: BankOption[];
    isBankListLoading: boolean;
    totalPriceNumber: number;
    onSubmit: (data: {
        amount: number;
        transferredAt: string;
        transactionRef: string;
        senderBank: string;
        senderAccountName: string;
        note: string;
    }) => Promise<{ success: boolean; error?: string }>;
    onClose: () => void;
};

export function PaymentIssueModal({ booking, banksList, isBankListLoading, totalPriceNumber, onSubmit, onClose }: Props) {
    const { formatPrice } = useLocale();
    const [form, setForm] = useState<PaymentIssueForm>(createEmptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const [bankSearchQuery, setBankSearchQuery] = useState('');
    const bankDropdownRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => { dialogRef.current?.focus(); }, []);

    useEffect(() => {
        if (!isBankDropdownOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
                setIsBankDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isBankDropdownOpen]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isBankDropdownOpen) { setIsBankDropdownOpen(false); return; }
            onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isBankDropdownOpen, onClose]);

    const updateForm = useCallback((patch: Partial<PaymentIssueForm>) => {
        setForm(prev => ({ ...prev, ...patch }));
        if (error) setError('');
    }, [error]);

    const selectedBank = useMemo(
        () => banksList.find(b => b.shortName === form.senderBank),
        [banksList, form.senderBank],
    );

    const filteredBanks = useMemo(() => {
        const q = bankSearchQuery.trim().toLowerCase();
        if (!q) return banksList;
        return banksList.filter(b => b.shortName.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
    }, [bankSearchQuery, banksList]);

    const handleSubmit = async () => {
        const amount = parseMoneyInput(form.amount);
        if (amount <= 0) { setError('Vui lòng nhập số tiền bạn đã chuyển.'); return; }
        if (!form.transferredAt) { setError('Vui lòng nhập thời gian chuyển khoản.'); return; }
        if (form.transactionRef.trim().length < 4) { setError('Vui lòng nhập mã giao dịch hoặc nội dung chuyển khoản.'); return; }
        if (!form.senderBank.trim()) { setError('Vui lòng chọn ngân hàng chuyển khoản.'); return; }
        if (form.senderAccountName.trim().length < 2) { setError('Vui lòng nhập tên chủ tài khoản chuyển.'); return; }

        const senderBankLabel = selectedBank
            ? `${selectedBank.shortName} - ${selectedBank.name}`
            : form.senderBank;

        setIsSubmitting(true);
        const result = await onSubmit({
            amount,
            transferredAt: form.transferredAt,
            transactionRef: form.transactionRef.trim(),
            senderBank: senderBankLabel,
            senderAccountName: form.senderAccountName.trim(),
            note: form.note.trim(),
        });
        setIsSubmitting(false);
        if (!result.success) setError(result.error ?? 'Lỗi kết nối. Vui lòng thử lại.');
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
            onClick={(event) => { if (event.target !== event.currentTarget) return; onClose(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-issue-title"
                aria-describedby={error ? 'payment-issue-error' : undefined}
                tabIndex={-1}
                className="w-full max-w-2xl rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-slate-900/10 focus:outline-none"
            >
                <div className="rounded-t-[1.75rem] bg-gradient-to-r from-sky-700 to-blue-600 px-5 py-5 text-white sm:px-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                                <span className="material-symbols-outlined text-2xl">fact_check</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100">
                                    Đối soát thanh toán
                                </p>
                                <h2 id="payment-issue-title" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                                    Kiểm tra khoản chuyển của bạn
                                </h2>
                                <p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-50/90">
                                    Cung cấp thông tin trên biên lai để nhân viên kiểm tra nhanh hơn. Trong lúc chờ đối soát, bạn không cần tạo thanh toán lại.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                            aria-label="Đóng form kiểm tra thanh toán"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                <form
                    className="space-y-5 px-5 py-5 sm:px-7 sm:py-6"
                    onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}
                >
                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mã đặt tour</p>
                            <p className="mt-1 font-extrabold text-slate-900">{booking.bookingCode}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng cần thanh toán</p>
                            <p className="mt-1 font-extrabold text-sky-700">{formatPrice(totalPriceNumber)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</p>
                            <p className="mt-1 font-extrabold text-amber-600">Chờ ghi nhận</p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block space-y-2 text-sm font-bold text-slate-700">
                            Số tiền đã chuyển
                            <input
                                value={form.amount}
                                onChange={e => updateForm({ amount: e.target.value })}
                                inputMode="numeric"
                                required
                                placeholder="VD: 6120000"
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            />
                        </label>
                        <label className="block space-y-2 text-sm font-bold text-slate-700">
                            Thời gian chuyển
                            <input
                                type="datetime-local"
                                value={form.transferredAt}
                                onChange={e => updateForm({ transferredAt: e.target.value })}
                                required
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            />
                        </label>
                    </div>

                    <label className="block space-y-2 text-sm font-bold text-slate-700">
                        Mã giao dịch hoặc nội dung chuyển khoản
                        <input
                            value={form.transactionRef}
                            onChange={e => updateForm({ transactionRef: e.target.value })}
                            required
                            placeholder="VD: FT260526XMZR hoặc BK-260526-XMZR"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="block space-y-2 text-sm font-bold text-slate-700">
                            <span id="bank-label">Ngân hàng chuyển</span>
                            <div className="relative" ref={bankDropdownRef}>
                                <button
                                    type="button"
                                    aria-haspopup="listbox"
                                    aria-expanded={isBankDropdownOpen}
                                    aria-labelledby="bank-label"
                                    onClick={() => { setIsBankDropdownOpen(prev => !prev); setBankSearchQuery(''); }}
                                    className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white px-4 text-left text-sm font-semibold outline-none transition hover:border-sky-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${selectedBank ? 'text-slate-900' : 'text-slate-400'}`}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-sky-700">account_balance</span>
                                        <span className="truncate">
                                            {isBankListLoading && banksList.length === 0
                                                ? 'Đang tải danh sách ngân hàng...'
                                                : selectedBank
                                                    ? `${selectedBank.shortName} - ${selectedBank.name}`
                                                    : 'Tìm hoặc chọn ngân hàng...'}
                                        </span>
                                    </span>
                                    <span
                                        className="material-symbols-outlined shrink-0 text-lg text-slate-400 transition-transform duration-200"
                                        style={{ transform: isBankDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                    >
                                        expand_more
                                    </span>
                                </button>

                                {isBankDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full z-[70] mt-2 flex max-h-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
                                        <div className="border-b border-slate-100 bg-slate-50/80 p-2">
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                                                <input
                                                    type="text"
                                                    placeholder="Gõ để tìm tên hoặc mã ngân hàng..."
                                                    aria-label="Tìm ngân hàng chuyển khoản"
                                                    value={bankSearchQuery}
                                                    onChange={e => setBankSearchQuery(e.target.value)}
                                                    autoFocus
                                                    className="h-10 w-full rounded-xl border border-sky-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                />
                                            </div>
                                        </div>
                                        <div role="listbox" aria-labelledby="bank-label" className="overflow-y-auto overflow-x-hidden">
                                            {filteredBanks.length > 0 ? (
                                                filteredBanks.map(bank => (
                                                    <button
                                                        key={`${bank.shortName}-${bank.name}`}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={form.senderBank === bank.shortName}
                                                        onClick={() => {
                                                            updateForm({ senderBank: bank.shortName });
                                                            setIsBankDropdownOpen(false);
                                                            setBankSearchQuery('');
                                                        }}
                                                        className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-sky-50 ${form.senderBank === bank.shortName ? 'bg-sky-50/80 font-bold text-sky-800' : 'font-medium'}`}
                                                    >
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1">
                                                            {bank.logo ? (
                                                                <Image
                                                                    src={bank.logo}
                                                                    alt={bank.shortName}
                                                                    width={32}
                                                                    height={32}
                                                                    sizes="32px"
                                                                    className="max-h-full max-w-full object-contain"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-sm text-slate-400">account_balance</span>
                                                            )}
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate">
                                                            {bank.shortName} - {bank.name}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                                                    Không tìm thấy ngân hàng phù hợp
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <label className="block space-y-2 text-sm font-bold text-slate-700">
                            Tên chủ tài khoản chuyển
                            <input
                                value={form.senderAccountName}
                                onChange={e => updateForm({ senderAccountName: e.target.value })}
                                required
                                placeholder="VD: Dao Thanh Ha"
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                            />
                        </label>
                    </div>

                    <label className="block space-y-2 text-sm font-bold text-slate-700">
                        Ghi chú thêm
                        <textarea
                            value={form.note}
                            onChange={e => updateForm({ note: e.target.value })}
                            rows={4}
                            placeholder="VD: Tôi đã chuyển khoản nhưng hệ thống chưa ghi nhận sau khi quay lại trang."
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />
                    </label>

                    {error && (
                        <div id="payment-issue-error" role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            <span className="material-symbols-outlined text-base mt-0.5">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 rounded-2xl border border-slate-200 px-6 text-sm font-bold text-slate-500 transition hover:bg-slate-50 sm:min-w-32"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-40"
                        >
                            {isSubmitting ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    Đang gửi...
                                </span>
                            ) : 'Gửi kiểm tra'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
