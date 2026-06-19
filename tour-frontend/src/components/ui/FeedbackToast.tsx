'use client';

import { useEffect, useRef } from 'react';

type FeedbackToastType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackToastProps {
    type?: FeedbackToastType;
    title: string;
    message: string;
    onClose: () => void;
    duration?: number;
}

const toastTone = {
    success: {
        icon: 'check_circle',
        iconClass: 'bg-tertiary-container/10 text-tertiary-container ring-tertiary-container/15',
        progressClass: 'bg-tertiary-container',
    },
    error: {
        icon: 'error',
        iconClass: 'bg-error/10 text-error ring-error/15',
        progressClass: 'bg-error',
    },
    info: {
        icon: 'info',
        iconClass: 'bg-primary/10 text-primary ring-primary/15',
        progressClass: 'bg-primary',
    },
    warning: {
        icon: 'warning',
        iconClass: 'bg-yellow-500/10 text-yellow-600 ring-yellow-500/15',
        progressClass: 'bg-yellow-500',
    },
};

export default function FeedbackToast({
    type = 'success',
    title,
    message,
    onClose,
    duration = 3000,
}: FeedbackToastProps) {
    const tone = toastTone[type];

    // Giữ onClose trong ref để timer chỉ đặt một lần theo duration; nếu phụ thuộc
    // trực tiếp onClose, mỗi lần toast khác stack vào sẽ tạo onClose mới và reset
    // timer khiến toast không tự biến mất.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => onCloseRef.current(), duration);
        return () => window.clearTimeout(timeoutId);
    }, [duration]);

    if (!message && !title) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="relative w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-lowest shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-white/80 animate-fade-slide-down"
        >
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ${tone.iconClass}`}>
                    <span
                        className="material-symbols-outlined text-[22px]"
                        aria-hidden="true"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        {tone.icon}
                    </span>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-headline text-sm font-extrabold leading-5 tracking-tight text-on-surface">
                        {title}
                    </p>
                    {message && (
                        <p className="mt-0.5 text-[13px] font-medium leading-5 text-on-surface-variant">
                            {message}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    aria-label="Dismiss notification"
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        close
                    </span>
                </button>
            </div>

            <div className="h-1 bg-surface-container-high">
                <div
                    className={`h-full origin-left animate-toast-progress ${tone.progressClass}`}
                    style={{ animationDuration: `${duration}ms` }}
                />
            </div>
        </div>
    );
}
