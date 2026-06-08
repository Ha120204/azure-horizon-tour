'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

const variantStyles: Record<
  DialogVariant,
  { iconBg: string; iconColor: string; confirmBtn: string }
> = {
  danger: {
    iconBg:    'bg-error/10',
    iconColor: 'text-error',
    confirmBtn:'bg-error text-on-error hover:opacity-90 focus-visible:ring-error',
  },
  warning: {
    iconBg:    'bg-amber-500/10',
    iconColor: 'text-amber-600',
    confirmBtn:'bg-amber-600 text-white hover:opacity-90 focus-visible:ring-amber-500',
  },
  info: {
    iconBg:    'bg-primary/10',
    iconColor: 'text-primary',
    confirmBtn:'bg-primary text-on-primary hover:opacity-90 focus-visible:ring-primary',
  },
  success: {
    iconBg:    'bg-tertiary/10',
    iconColor: 'text-tertiary',
    confirmBtn:'bg-tertiary text-on-tertiary hover:opacity-90 focus-visible:ring-tertiary',
  },
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  variant?: DialogVariant;
  /** Material Symbol icon name */
  icon?: string;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  /** Override z-index for stacking on top of modals (default 60) */
  zIndex?: number;
  /** Close when clicking the backdrop (default true) */
  closeOnBackdrop?: boolean;
}

export default function Dialog({
  open,
  onClose,
  variant = 'info',
  icon,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  loading = false,
  zIndex = 60,
  closeOnBackdrop = true,
}: DialogProps) {
  const titleId = 'dialog-title';
  const styles = variantStyles[variant];

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Body */}
            <div className="p-7">
              {icon && (
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${styles.iconBg}`}>
                  <span
                    className={`material-symbols-outlined text-2xl ${styles.iconColor}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                </div>
              )}

              <h2 id={titleId} className="text-lg font-bold text-on-surface mb-2">
                {title}
              </h2>
              {description && (
                <div className="text-sm text-on-surface-variant leading-relaxed">
                  {description}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 pb-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 flex items-center gap-2 focus-visible:ring-2 outline-none ${styles.confirmBtn}`}
              >
                {loading && (
                  <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">
                    progress_activity
                  </span>
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
