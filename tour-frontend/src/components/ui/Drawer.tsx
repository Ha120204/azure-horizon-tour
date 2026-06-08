'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type DrawerSide = 'right' | 'left';
type DrawerWidth = 'sm' | 'md' | 'lg' | 'xl';

const widthClasses: Record<DrawerWidth, string> = {
  sm: 'max-w-sm',   // 384px
  md: 'max-w-md',   // 448px
  lg: 'max-w-lg',   // 512px
  xl: 'max-w-2xl',  // 672px
};

const slideVariants = {
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit:    { x: '100%' },
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit:    { x: '-100%' },
  },
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  width?: DrawerWidth;
  /** aria-labelledby value — point to your heading's id */
  labelledBy?: string;
  closeOnBackdrop?: boolean;
  className?: string;
  backdropClassName?: string;
  children: ReactNode;
}

export default function Drawer({
  open,
  onClose,
  side = 'right',
  width = 'md',
  labelledBy,
  closeOnBackdrop = true,
  className = '',
  backdropClassName = '',
  children,
}: DrawerProps) {
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

  const { initial, animate, exit } = slideVariants[side];
  const positionClass = side === 'right' ? 'right-0' : 'left-0';

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex"
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
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Panel */}
          <motion.div
            className={`absolute inset-y-0 ${positionClass} flex w-full ${widthClasses[width]} flex-col bg-surface shadow-2xl overflow-hidden ${className}`}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Scrollable body section inside a Drawer */
export function DrawerBody({
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
