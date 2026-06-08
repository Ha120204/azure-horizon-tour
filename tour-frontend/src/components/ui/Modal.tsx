'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-[1240px]',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  /** aria-labelledby value — point to your heading's id */
  labelledBy?: string;
  /** Max height cap, default 92vh */
  maxHeight?: string;
  closeOnBackdrop?: boolean;
  /** Override z-index (default 50) */
  zIndex?: number;
  className?: string;
  backdropClassName?: string;
  children: ReactNode;
}

export default function Modal({
  open,
  onClose,
  size = 'md',
  labelledBy,
  maxHeight = '92vh',
  closeOnBackdrop = true,
  zIndex = 50,
  className = '',
  backdropClassName = '',
  children,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
        >
          {/* Backdrop */}
          <motion.div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${backdropClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Container */}
          <motion.div
            ref={containerRef}
            className={`relative w-full ${sizeClasses[size]} flex flex-col bg-surface rounded-2xl shadow-2xl overflow-hidden ${className}`}
            style={{ maxHeight }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Scrollable body section inside a Modal */
export function ModalBody({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}
