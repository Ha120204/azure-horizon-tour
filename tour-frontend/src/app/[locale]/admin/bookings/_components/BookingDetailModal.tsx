'use client';

import { useEffect, useState } from 'react';
import type { Booking } from '../_lib/types';
import { BookingDetailView } from './BookingDetailView';
import { BookingActionBar } from './BookingActionBar';

// ─── Booking Detail Modal ─────────────────────────────────────────────────────

export function BookingDetailModal({
  booking,
  onClose,
  onConfirmSuccess,
  onCopyPaymentRequest,
  onResendPaymentRequest,
}: {
  booking: Booking;
  onClose: () => void;
  onConfirmSuccess: (updated: Booking) => void | Promise<void>;
  onCopyPaymentRequest?: (booking: Booking) => void | Promise<void>;
  onResendPaymentRequest?: (booking: Booking, forceEmail?: boolean) => void | Promise<void>;
}) {
  // Kept here: Escape key needs to know which form is open to close it instead of the modal
  const [showInStoreForm, setShowInStoreForm] = useState(false);
  const [showReconcileForm, setShowReconcileForm] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showInStoreForm) { setShowInStoreForm(false); return; }
      if (showReconcileForm) { setShowReconcileForm(false); return; }
      onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose, showInStoreForm, showReconcileForm]);

  const hasOpenForm = showInStoreForm || showReconcileForm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={hasOpenForm ? undefined : onClose} />

      <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] min-h-0 flex flex-col overflow-hidden overscroll-contain animate-fade-slide-up">
        <BookingDetailView booking={booking} onClose={onClose} />
        <BookingActionBar
          booking={booking}
          showInStoreForm={showInStoreForm}
          showReconcileForm={showReconcileForm}
          onShowInStoreForm={() => setShowInStoreForm(true)}
          onHideInStoreForm={() => setShowInStoreForm(false)}
          onShowReconcileForm={() => setShowReconcileForm(true)}
          onHideReconcileForm={() => setShowReconcileForm(false)}
          onConfirmSuccess={onConfirmSuccess}
          onCopyPaymentRequest={onCopyPaymentRequest}
          onResendPaymentRequest={onResendPaymentRequest}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
