'use client';

/**
 * GlobalToast — Client component lắng nghe toastEmitter và render FeedbackToast.
 *
 * Đặt 1 lần trong root layout. Tất cả toast từ apiClient, hooks, hoặc
 * bất kỳ service nào đều xuất hiện ở đây mà không cần prop drilling.
 */

import { useEffect, useState, useCallback } from 'react';
import { toastEmitter, type ToastEvent } from '@/lib/toastEmitter';
import FeedbackToast from './FeedbackToast';

interface ActiveToast extends ToastEvent {
  id: number;
}

let toastCounter = 0;

export default function GlobalToast() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const addToast = useCallback((event: ToastEvent) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { ...event, id }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return toastEmitter.subscribe(addToast);
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-24 z-[200] flex flex-col gap-3 sm:right-6"
    >
      {toasts.map((toast, idx) => (
        <div key={toast.id} className="pointer-events-auto" style={{ zIndex: 200 - idx }}>
          <FeedbackToast
            type={toast.type === 'info' || toast.type === 'warning' ? 'error' : toast.type}
            title={toast.title}
            message={toast.message ?? ''}
            duration={toast.duration ?? (toast.type === 'error' ? 5000 : 3500)}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
