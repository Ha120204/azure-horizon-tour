'use client';

import { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { useLocale } from '@/context/LocaleContext';
import type { QRPaymentData } from '../_lib/types';

type Props = {
    data: QRPaymentData;
    secondsLeft: number | null;
    isSuccess: boolean;
    onClose: () => void;
    onOpenIssueForm: () => void;
};

export function PaymentQRModal({ data, secondsLeft, isSuccess, onClose, onOpenIssueForm }: Props) {
    const { formatPrice } = useLocale();
    const [copied, setCopied] = useState<string | null>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    const isExpired = secondsLeft !== null && secondsLeft <= 0;
    const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
    const secs = secondsLeft !== null ? secondsLeft % 60 : 0;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDownload = () => {
        const svgEl = qrRef.current?.querySelector('svg');
        if (!svgEl) return;
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new window.Image();
        img.onload = () => {
            const padding = 24;
            const canvas = document.createElement('canvas');
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);
            URL.revokeObjectURL(svgUrl);
            canvas.toBlob((blob) => {
                if (!blob) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `QR-${data.description}.png`;
                a.click();
                URL.revokeObjectURL(a.href);
            }, 'image/png');
        };
        img.src = svgUrl;
    };

    const handleIssueForm = () => {
        onClose();
        onOpenIssueForm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={!isSuccess ? onClose : undefined}
            />

            <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[440px] flex flex-col overflow-hidden">

                {/* Success overlay */}
                {isSuccess && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white rounded-3xl gap-4">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-lg text-on-surface">Thanh toán thành công!</p>
                            <p className="text-sm text-outline mt-1">Đang chuyển đến trang xác nhận...</p>
                        </div>
                        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-5">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">credit_card</span>
                        <h3 className="font-bold text-on-surface text-lg">Thanh toán chuyển khoản</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="group/close flex h-11 w-11 items-center justify-center rounded-full text-outline outline-none transition-[background-color,color,transform] duration-200 ease-out hover:scale-105 hover:bg-slate-100 hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-out group-hover/close:rotate-90 motion-reduce:transform-none">close</span>
                    </button>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center px-7 pb-5">
                    <div
                        ref={qrRef}
                        className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-opacity ${isExpired ? 'opacity-30 grayscale' : ''}`}
                    >
                        {data.qrCode ? (
                            <QRCode value={data.qrCode} size={220} bgColor="#ffffff" fgColor="#000000" level="M" />
                        ) : (
                            <div className="w-[220px] h-[220px] flex items-center justify-center bg-slate-50 rounded-xl">
                                <span className="material-symbols-outlined text-5xl text-outline">qr_code_2</span>
                            </div>
                        )}
                    </div>

                    {!isExpired && secondsLeft !== null && secondsLeft > 0 && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-amber-700 text-sm font-bold">
                            <span className="material-symbols-outlined text-sm animate-pulse">timer</span>
                            <span>Thanh toán trong <span className="font-mono">{timeStr}</span></span>
                        </div>
                    )}
                    {isExpired && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-red-600 text-sm font-bold">
                            <span className="material-symbols-outlined text-sm">error</span>
                            <span>Mã QR đã hết hạn</span>
                        </div>
                    )}
                </div>

                {/* Bank info */}
                <div className="mx-7 mb-4 border border-slate-100 rounded-2xl divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-outline">Số tiền</span>
                        <span className="font-black text-primary text-base">{formatPrice(data.amount)}</span>
                    </div>

                    {data.accountNumber && (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-outline">Số tài khoản</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-on-surface">{data.accountNumber}</span>
                                <button
                                    onClick={() => copy(data.accountNumber!, 'account')}
                                    className="group/copy inline-flex size-11 items-center justify-center rounded-lg text-outline outline-none transition-[background-color,color,transform] duration-200 ease-out hover:scale-105 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
                                    title="Sao chép"
                                >
                                    <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/copy:scale-110 motion-reduce:transform-none">
                                        {copied === 'account' ? 'check' : 'content_copy'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {data.accountName && (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-outline">Chủ tài khoản</span>
                            <span className="font-bold text-on-surface">{data.accountName}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-outline">Nội dung CK</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-on-surface tracking-wide">{data.description}</span>
                            <button
                                onClick={() => copy(data.description, 'desc')}
                                className="group/copy inline-flex size-11 items-center justify-center rounded-lg text-outline outline-none transition-[background-color,color,transform] duration-200 ease-out hover:scale-105 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
                                title="Sao chép"
                            >
                                <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/copy:scale-110 motion-reduce:transform-none">
                                    {copied === 'desc' ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Note */}
                <p className="mx-7 mb-4 text-xs text-outline text-center leading-relaxed">
                    Nhập <strong className="text-on-surface">{data.description}</strong> làm nội dung chuyển khoản để hệ thống tự động xác nhận.
                </p>

                {/* Waiting indicator */}
                {!isExpired && !isSuccess && (
                    <div className="mx-7 mb-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                        </span>
                        <span>Đang chờ xác nhận thanh toán...</span>
                    </div>
                )}

                {/* Footer */}
                <div className="px-7 pb-7 flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={isExpired || !data.qrCode}
                            className="group/download inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-on-surface outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-slate-50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/download:translate-y-0.5 motion-reduce:transform-none">download</span>
                            Tải mã QR
                        </button>
                        <button
                            onClick={onClose}
                            className="min-h-11 flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-on-surface outline-none transition-[background-color,border-color,color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            Đóng
                        </button>
                    </div>
                    <button
                        onClick={handleIssueForm}
                        className="group/review inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-3 text-sm font-bold text-sky-700 outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                        <span className="material-symbols-outlined text-base transition-transform duration-200 ease-out group-hover/review:scale-110 group-hover/review:-rotate-6 motion-reduce:transform-none">fact_check</span>
                        Tôi đã chuyển khoản, yêu cầu kiểm tra
                    </button>
                </div>
            </div>
        </div>
    );
}
