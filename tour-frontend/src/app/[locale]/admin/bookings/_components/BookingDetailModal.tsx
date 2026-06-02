'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { API_BASE_URL } from '@/lib/constants';
import {
  AVATAR_COLORS,
  CONFIRMED_SOURCE_LABEL,
  PAYMENT_METHOD_CFG,
  PAY_CFG,
  STATUS_CFG,
} from '../_lib/config';
import { fmt, fmtDate, fmtDateTime, getErrorMessage, getInitials, toValidDate } from '../_lib/helpers';
import type { Booking, BookingNotification, PaymentTransaction } from '../_lib/types';

function getVisibleTransactions(
  booking: Booking,
  currentGateway: 'MANUAL' | 'PAYOS',
  hasSuccessfulCurrentGateway: boolean,
): PaymentTransaction[] {
  const seenOpenPayos = new Set<string>();
  return [...(booking.transactions ?? [])]
    .sort((a, b) => {
      const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return createdDiff || b.id - a.id;
    })
    .filter((tx) => {
      if (tx.status === 'SUCCESS') return true;
      if (
        booking.paymentStatus === 'PAID' &&
        tx.gateway === currentGateway &&
        tx.status === 'PENDING' &&
        hasSuccessfulCurrentGateway
      ) {
        return false;
      }
      if (booking.paymentMethod === 'IN_STORE' && tx.gateway !== 'MANUAL') return false;
      if (booking.paymentMethod === 'PAYOS' && tx.gateway !== 'PAYOS') return false;

      if (tx.gateway === 'PAYOS' && tx.status === 'PENDING') {
        const key = `${tx.gateway}:${tx.status}:${Math.round(Number(tx.amount) || 0)}`;
        if (seenOpenPayos.has(key)) return false;
        seenOpenPayos.add(key);
      }

      return true;
    });
}

function toTelHref(phone?: string | null) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
}

function toZaloPhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (!digits) return '';
  if (digits.startsWith('84')) return digits;
  if (digits.startsWith('0')) return `84${digits.slice(1)}`;
  return digits;
}

type BookingTimelineItem = {
  id: string;
  title: string;
  description: string;
  actor: string;
  note?: string;
  time?: string | null;
  icon: string;
  tone: 'blue' | 'amber' | 'emerald' | 'red' | 'slate';
};

const timelineToneClass: Record<BookingTimelineItem['tone'], string> = {
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
  amber: 'bg-amber-50 border-amber-100 text-amber-700',
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  red: 'bg-red-50 border-red-100 text-red-700',
  slate: 'bg-surface-container border-outline-variant/10 text-on-surface-variant',
};

function getCancelActorLabel(cancelledBy?: string | null) {
  switch (cancelledBy) {
    case 'ADMIN':
      return 'Admin';
    case 'CUSTOMER':
      return 'Khách hàng';
    case 'SYSTEM':
      return 'Hệ thống';
    default:
      return 'Chưa rõ nguồn hủy';
  }
}

function getPaymentActorLabel(tx?: PaymentTransaction) {
  if (!tx) return 'Hệ thống thanh toán';
  const sourceLabel = CONFIRMED_SOURCE_LABEL[tx.confirmedSource ?? ''] ?? tx.confirmedSource;
  if (sourceLabel) return sourceLabel;
  if (tx.gateway === 'PAYOS') return 'PayOS';
  if (tx.gateway === 'MANUAL') return 'Nhân viên tại quầy';
  return tx.gateway;
}

type CancellationPolicySummary = {
  statusLabel: string;
  statusTone: string;
  refundLabel: string;
  condition: string;
  deadline: string;
  note: string;
};

function daysBetweenCalendarDates(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.ceil((end - start) / 86_400_000);
}

function getCancellationPolicySummary(booking: Booking): CancellationPolicySummary {
  const departureDate = toValidDate(booking.departureDate);
  const createdAt = toValidDate(booking.createdAt);
  const now = new Date();

  if (booking.status === 'CANCELLED') {
    return {
      statusLabel: 'Đơn đã hủy',
      statusTone: 'bg-red-50 text-red-700 border-red-200',
      refundLabel: booking.refundAmount != null ? fmt(Number(booking.refundAmount)) : 'Theo ghi chú xử lý',
      condition: booking.cancelReason ? `Lý do hủy: ${booking.cancelReason}` : 'Đơn đã được chuyển sang trạng thái hủy.',
      deadline: booking.cancelledAt ? `Hủy lúc ${fmtDateTime(booking.cancelledAt)}` : 'Chưa có thời điểm hủy',
      note: booking.refundNote ?? 'Chưa có ghi chú hoàn tiền.',
    };
  }

  if (booking.status === 'CANCEL_REQUESTED') {
    return {
      statusLabel: 'Chờ duyệt hủy',
      statusTone: 'bg-amber-50 text-amber-700 border-amber-200',
      refundLabel: booking.refundAmount != null ? fmt(Number(booking.refundAmount)) : 'Đang chờ xác nhận',
      condition: booking.cancelReason ? `Lý do khách gửi: ${booking.cancelReason}` : 'Khách đã gửi yêu cầu hủy.',
      deadline: booking.cancelRequestedAt ? `Yêu cầu gửi lúc ${fmtDateTime(booking.cancelRequestedAt)}` : 'Chưa có thời điểm yêu cầu',
      note: booking.refundNote ?? 'Admin cần kiểm tra chính sách hủy trước khi duyệt.',
    };
  }

  if (!departureDate) {
    return {
      statusLabel: 'Thiếu ngày khởi hành',
      statusTone: 'bg-slate-50 text-slate-700 border-slate-200',
      refundLabel: 'Chưa xác định',
      condition: 'Không đủ dữ liệu để tính chính sách hủy.',
      deadline: 'Cần kiểm tra ngày khởi hành của tour',
      note: 'Hãy xác minh lịch khởi hành trước khi tư vấn hủy hoặc hoàn tiền.',
    };
  }

  const daysUntilDeparture = daysBetweenCalendarDates(now, departureDate);

  if (daysUntilDeparture < 0) {
    return {
      statusLabel: 'Không thể hủy',
      statusTone: 'bg-slate-50 text-slate-700 border-slate-200',
      refundLabel: fmt(0),
      condition: 'Chuyến đi đã qua ngày khởi hành.',
      deadline: `Đã khởi hành ngày ${fmtDate(booking.departureDate)}`,
      note: 'Không hỗ trợ hủy online cho chuyến đi đã hoàn tất hoặc đã khởi hành.',
    };
  }

  if (daysUntilDeparture === 0) {
    return {
      statusLabel: 'Không thể hủy online',
      statusTone: 'bg-red-50 text-red-700 border-red-200',
      refundLabel: fmt(0),
      condition: 'Tour khởi hành hôm nay.',
      deadline: `Khởi hành ${fmtDate(booking.departureDate)}`,
      note: 'Cần xử lý thủ công nếu có tình huống đặc biệt.',
    };
  }

  if (booking.paymentStatus !== 'PAID') {
    return {
      statusLabel: 'Có thể hủy',
      statusTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refundLabel: fmt(0),
      condition: 'Đơn chưa thanh toán nên không phát sinh khoản hoàn tiền.',
      deadline: `Trước ngày khởi hành ${fmtDate(booking.departureDate)}`,
      note: 'Hủy đơn sẽ giải phóng chỗ giữ, không cần xử lý hoàn tiền.',
    };
  }

  const hoursSinceBooking = createdAt ? (now.getTime() - createdAt.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
  const fullRefundDeadline = createdAt ? new Date(createdAt.getTime() + 24 * 3_600_000) : null;
  let refundPercent = 0;
  let condition = 'Hủy dưới 3 ngày trước ngày khởi hành.';
  let deadline = 'Không còn hạn hủy có hoàn tiền.';

  if (hoursSinceBooking <= 24) {
    refundPercent = 100;
    condition = 'Hủy trong 24 giờ sau khi đặt.';
    deadline = fullRefundDeadline ? `Hủy trước ${fmtDateTime(fullRefundDeadline.toISOString())}` : 'Trong 24 giờ sau khi đặt';
  } else if (daysUntilDeparture >= 7) {
    refundPercent = 80;
    condition = 'Hủy trước ngày khởi hành từ 7 ngày trở lên.';
    deadline = `Còn ${daysUntilDeparture} ngày trước khởi hành`;
  } else if (daysUntilDeparture >= 3) {
    refundPercent = 50;
    condition = 'Hủy trước ngày khởi hành từ 3 đến dưới 7 ngày.';
    deadline = `Còn ${daysUntilDeparture} ngày trước khởi hành`;
  }

  return {
    statusLabel: refundPercent > 0 ? 'Có thể hoàn tiền' : 'Không hoàn tiền',
    statusTone: refundPercent > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
    refundLabel: `${refundPercent}% · ${fmt(Math.round((booking.totalPrice * refundPercent) / 100))}`,
    condition,
    deadline,
    note: refundPercent > 0
      ? 'Khoản hoàn dự kiến sẽ được admin xác nhận khi duyệt hủy.'
      : 'Có thể vẫn cần ghi chú xử lý nếu admin hỗ trợ ngoại lệ.',
  };
}

function getBookingTimeline(
  booking: Booking,
  visibleTransactions: PaymentTransaction[],
  latestPaymentRequest?: BookingNotification,
): BookingTimelineItem[] {
  const successfulPayment = visibleTransactions.find(tx => tx.status === 'SUCCESS');
  const failedPayment = visibleTransactions.find(tx => tx.status === 'FAILED');
  const timeline: BookingTimelineItem[] = [
    {
      id: 'created',
      title: 'Tạo đơn',
      description: `${booking.numberOfPeople} khách · ${fmt(booking.totalPrice)}`,
      actor: 'Hệ thống đặt tour',
      note: 'Booking được ghi nhận từ luồng đặt tour.',
      time: booking.createdAt,
      icon: 'receipt_long',
      tone: 'blue',
    },
  ];

  if (latestPaymentRequest) {
    timeline.push({
      id: 'payment-request',
      title: 'Yêu cầu thanh toán',
      description: `Kênh ${latestPaymentRequest.channel} · Trạng thái ${latestPaymentRequest.status}`,
      actor: 'Hệ thống thông báo',
      note: latestPaymentRequest.errorMessage ?? 'Đã tạo yêu cầu để khách hoàn tất thanh toán.',
      time: latestPaymentRequest.sentAt ?? latestPaymentRequest.createdAt,
      icon: 'notifications_active',
      tone: latestPaymentRequest.status === 'FAILED' ? 'red' : 'amber',
    });
  }

  if (successfulPayment) {
    timeline.push({
      id: 'paid',
      title: 'Ghi nhận thanh toán',
      description: `${successfulPayment.gateway} · ${fmt(successfulPayment.amount)}`,
      actor: getPaymentActorLabel(successfulPayment),
      note: successfulPayment.confirmedNote ?? 'Giao dịch đã được ghi nhận thành công.',
      time: successfulPayment.confirmedAt ?? successfulPayment.createdAt,
      icon: 'check_circle',
      tone: 'emerald',
    });
  } else if (failedPayment) {
    timeline.push({
      id: 'payment-failed',
      title: 'Giao dịch không hiệu lực',
      description: `${failedPayment.gateway} · ${fmt(failedPayment.amount)}`,
      actor: getPaymentActorLabel(failedPayment),
      note: failedPayment.confirmedNote ?? 'Giao dịch bị hủy, hết hạn hoặc không hợp lệ.',
      time: failedPayment.confirmedAt ?? failedPayment.createdAt,
      icon: 'cancel',
      tone: 'red',
    });
  }

  if (booking.status === 'CANCEL_REQUESTED') {
    timeline.push({
      id: 'cancel-requested',
      title: 'Gửi yêu cầu hủy',
      description: booking.cancelReason ? `Lý do: ${booking.cancelReason}` : 'Khách đã gửi yêu cầu hủy, chưa có lý do chi tiết.',
      actor: 'Khách hàng',
      note: booking.refundNote ?? 'Đang chờ admin kiểm tra chính sách hủy và khoản hoàn.',
      time: booking.cancelRequestedAt,
      icon: 'pending',
      tone: 'amber',
    });
  } else if (booking.status === 'CANCELLED') {
    timeline.push({
      id: 'cancelled',
      title: 'Đã hủy đơn',
      description: booking.cancelReason ? `Lý do: ${booking.cancelReason}` : 'Đơn đã được chuyển sang trạng thái hủy.',
      actor: getCancelActorLabel(booking.cancelledBy),
      note: booking.refundNote ?? 'Chưa có ghi chú hoàn tiền.',
      time: booking.cancelledAt ?? booking.cancelRequestedAt,
      icon: 'block',
      tone: 'red',
    });
  } else if (booking.status === 'CONFIRMED') {
    timeline.push({
      id: 'confirmed',
      title: 'Đơn đã xác nhận',
      description: booking.paymentStatus === 'PAID' ? 'Đủ điều kiện vận hành tour' : 'Cần kiểm tra lại trạng thái thanh toán',
      actor: successfulPayment ? getPaymentActorLabel(successfulPayment) : 'Admin / hệ thống',
      note: booking.paymentStatus === 'PAID' ? 'Đơn đã đủ điều kiện vận hành sau khi thanh toán.' : 'Trạng thái đơn đã xác nhận nhưng thanh toán chưa khớp.',
      time: successfulPayment?.confirmedAt ?? successfulPayment?.createdAt,
      icon: 'verified',
      tone: 'emerald',
    });
  } else if (booking.status === 'PENDING') {
    timeline.push({
      id: 'pending',
      title: 'Đang chờ xử lý',
      description: booking.paymentStatus === 'UNPAID' ? 'Cần nhắc khách hoàn tất thanh toán' : 'Cần kiểm tra trạng thái mới nhất',
      actor: 'Admin / hệ thống',
      note: booking.paymentStatus === 'UNPAID' ? 'Ưu tiên kiểm tra hạn giữ chỗ và gửi nhắc thanh toán.' : 'Theo dõi giao dịch hoặc ticket hỗ trợ liên quan.',
      time: null,
      icon: 'pending_actions',
      tone: 'amber',
    });
  }

  return timeline;
}

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
  const sc = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING;
  const pc = PAY_CFG[booking.paymentStatus] ?? PAY_CFG.UNPAID;
  const colorIdx = booking.user.id % AVATAR_COLORS.length;
  const latestPaymentRequest = booking.paymentMethod === 'PAYOS' && booking.paymentStatus !== 'PAID'
    ? booking.notifications?.[0]
    : undefined;
  const discountAmount = Math.max(0, Number(booking.discountAmount) || 0);
  const subtotalBeforeDiscount = booking.totalPrice + discountAmount;
  const hasDiscount = discountAmount > 0;

  const mc = PAYMENT_METHOD_CFG[booking.paymentMethod] ?? PAYMENT_METHOD_CFG.PAYOS;

  // ── IN_STORE form state
  const [inStoreMethod, setInStoreMethod] = useState<'CASH'|'BANK_TRANSFER'|'CARD_POS'>('CASH');
  const [inStoreNote, setInStoreNote] = useState('');
  const [inStoreRef, setInStoreRef] = useState('');
  const [isConfirmingInStore, setIsConfirmingInStore] = useState(false);
  const [showInStoreForm, setShowInStoreForm] = useState(false);

  // ── PayOS reconcile form state
  const [showReconcileForm, setShowReconcileForm] = useState(false);
  const [reconcileTxRef, setReconcileTxRef] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [isSyncingPayos, setIsSyncingPayos] = useState(false);

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const isPending = booking.status === 'PENDING';
  const isUnpaidOrProcessing = booking.paymentStatus === 'UNPAID' || booking.paymentStatus === 'PROCESSING';
  const openPaymentTicket = booking.supportTickets?.find(t => t.category === 'payment' && ['NEW','IN_PROGRESS'].includes(t.status));
  const canResendPaymentRequest = isPending && booking.paymentStatus === 'UNPAID' && booking.paymentMethod === 'PAYOS';
  const hasPaymentRequestContent = Boolean(latestPaymentRequest?.content);
  const currentGateway = booking.paymentMethod === 'IN_STORE' ? 'MANUAL' : 'PAYOS';
  const hasSuccessfulCurrentGateway = (booking.transactions ?? []).some((tx) =>
    tx.gateway === currentGateway && tx.status === 'SUCCESS',
  );
  const visibleTransactions = getVisibleTransactions(booking, currentGateway, hasSuccessfulCurrentGateway);
  const contactPhone = booking.contactPhone ?? booking.user.phone ?? '';
  const telHref = toTelHref(contactPhone);
  const zaloPhone = toZaloPhone(contactPhone);
  const adminNote = booking.adminNote?.trim();
  const bookingTimeline = getBookingTimeline(booking, visibleTransactions, latestPaymentRequest);
  const successfulPayment = visibleTransactions.find(tx => tx.status === 'SUCCESS');
  const failedPayment = visibleTransactions.find(tx => tx.status === 'FAILED');
  const paymentRecordedAt = booking.paymentStatus === 'PAID'
    ? successfulPayment?.confirmedAt ?? successfulPayment?.createdAt
    : booking.paymentStatus === 'FAILED'
      ? failedPayment?.confirmedAt ?? failedPayment?.createdAt
      : latestPaymentRequest?.sentAt ?? latestPaymentRequest?.createdAt;
  const refundAmount = Math.max(0, Number(booking.refundAmount) || 0);
  const hasRefundAmount = booking.refundAmount != null && refundAmount > 0;
  const isRefundRelevant = Boolean(
    booking.status === 'CANCELLED' ||
    booking.status === 'CANCEL_REQUESTED' ||
    booking.refundedAt ||
    booking.refundAmount != null,
  );
  const cancellationFee = isRefundRelevant && booking.paymentStatus === 'PAID' && booking.refundAmount != null
    ? Math.max(0, booking.totalPrice - refundAmount)
    : null;
  const refundStatus = booking.refundedAt
    ? {
      label: 'Đã hoàn',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'assignment_returned',
    }
    : booking.paymentStatus === 'PAID' && (booking.status === 'CANCELLED' || booking.status === 'CANCEL_REQUESTED')
      ? {
        label: 'Đang xử lý',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: 'sync',
      }
      : {
        label: 'Không phát sinh',
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: 'remove_circle',
      };
  const cancellationPolicy = getCancellationPolicySummary(booking);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showInStoreForm) { setShowInStoreForm(false); return; }
        if (showReconcileForm) { setShowReconcileForm(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose, showInStoreForm, showReconcileForm]);

  const handleConfirmInStore = async () => {
    setIsConfirmingInStore(true); setActionError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/payments/in-store/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionMethod: inStoreMethod, receiptRef: inStoreRef || undefined, note: inStoreNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Xác nhận thất bại');
      await onConfirmSuccess({ ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' });
      setShowInStoreForm(false);
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Có lỗi xảy ra')); }
    finally { setIsConfirmingInStore(false); }
  };

  const handleCopyBookingCode = async () => {
    setActionError('');
    setActionSuccess('');
    try {
      await navigator.clipboard.writeText(booking.bookingCode);
      setActionSuccess('Đã sao chép mã đơn.');
    } catch {
      setActionError('Không sao chép được mã đơn. Vui lòng copy thủ công.');
    }
  };

  const handleCopyPaymentRequest = async () => {
    setActionError('');
    setActionSuccess('');
    if (onCopyPaymentRequest) {
      await onCopyPaymentRequest(booking);
      return;
    }
    if (!latestPaymentRequest?.content) {
      setActionError('Đơn này chưa có nội dung thanh toán để sao chép.');
      return;
    }
    try {
      await navigator.clipboard.writeText(latestPaymentRequest.content);
      setActionSuccess('Đã sao chép nội dung gửi khách.');
    } catch {
      setActionError('Không sao chép được nội dung thanh toán.');
    }
  };

  const handleResendPaymentRequest = async (forceEmail = false) => {
    setActionError('');
    setActionSuccess('');
    if (!canResendPaymentRequest) {
      setActionError('Chỉ có thể gửi lại yêu cầu thanh toán cho đơn PayOS đang chờ thanh toán.');
      return;
    }
    if (onResendPaymentRequest) {
      await onResendPaymentRequest(booking, forceEmail);
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/resend-payment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Không gửi lại được yêu cầu thanh toán');
      setActionSuccess(forceEmail ? 'Đã gửi lại email thanh toán.' : 'Đã tạo lại yêu cầu thanh toán.');
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Không gửi lại được yêu cầu thanh toán'));
    }
  };

  const handleViewPaymentHistory = () => {
    document.getElementById('booking-payment-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateAgain = () => {
    window.dispatchEvent(new CustomEvent('booking:create-assisted-draft', {
      detail: {
        bookingCode: booking.bookingCode,
        customerName: booking.user.fullName,
        customerEmail: booking.user.email,
        customerPhone: contactPhone,
        tourId: booking.tour?.id,
        numberOfPeople: booking.numberOfPeople,
        voucherCode: booking.voucherCode ?? '',
        internalNote: `Tạo lại từ đơn ${booking.bookingCode}`,
      },
    }));
    onClose();
  };

  const handleSyncPayos = async () => {
    setIsSyncingPayos(true); setActionError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/payments/payos/sync`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Sync thất bại');
      const data = json?.data ?? json;
      if (data?.synced) await onConfirmSuccess({ ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' });
      else setActionError(data?.message ?? 'PayOS chưa ghi nhận thanh toán.');
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Không kết nối được PayOS')); }
    finally { setIsSyncingPayos(false); }
  };

  const handleReconcile = async () => {
    if (!reconcileTxRef.trim()) { setActionError('Mã giao dịch là bắt buộc'); return; }
    if (!reconcileNote.trim() || reconcileNote.trim().length < 5) { setActionError('Ghi chú tối thiểu 5 ký tự'); return; }
    setIsReconciling(true); setActionError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/${booking.id}/payments/payos/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionRef: reconcileTxRef.trim(), amount: booking.totalPrice, note: reconcileNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Đối soát thất bại');
      await onConfirmSuccess({ ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' });
      setShowReconcileForm(false);
    } catch (e: unknown) { setActionError(getErrorMessage(e, 'Có lỗi xảy ra')); }
    finally { setIsReconciling(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={showInStoreForm || showReconcileForm ? undefined : onClose} />


      <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] min-h-0 flex flex-col overflow-hidden overscroll-contain animate-fade-slide-up">

        {/* ── Header gradient ── */}
        <div className="relative bg-gradient-to-br from-primary to-secondary p-6 pb-8 shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 10% 80%, white 1px, transparent 1px), radial-gradient(circle at 90% 20%, white 1px, transparent 1px)',
            backgroundSize: '45px 45px, 35px 35px',
          }} />
          <button onClick={onClose} aria-label="Đóng"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors focus-visible:ring-2 focus-visible:ring-white/80">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="flex flex-col gap-4 pr-12 sm:flex-row sm:items-start">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-2xl">receipt_long</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Chi tiết đơn đặt tour</p>
              <h2 id="bk-modal-title" className="text-xl font-bold text-white font-mono tracking-widest break-words">{booking.bookingCode}</h2>
              <p className="text-white/60 text-xs mt-1.5">{fmtDateTime(booking.createdAt)}</p>
            </div>
            <div className="grid w-full gap-2 shrink-0 sm:w-[230px]">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/65">Trạng thái đơn</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${sc.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/65">Thanh toán</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${pc.badge}`}>
                  <span className="material-symbols-outlined text-[12px]">{pc.icon}</span>
                  {pc.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/65">Hoàn tiền</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${refundStatus.badge}`}>
                  <span className="material-symbols-outlined text-[12px]">{refundStatus.icon}</span>
                  {refundStatus.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-8">
          <div className="space-y-5 p-6 pb-8">

            {/* Khách hàng */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">person</span>
                Thông tin khách hàng
              </h3>
              <div className="flex flex-col gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 sm:flex-row sm:items-center">
                {booking.user.avatarUrl ? (
                  <Image
                    src={booking.user.avatarUrl}
                    alt={booking.user.fullName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {getInitials(booking.user.fullName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-on-surface">{booking.user.fullName}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5 break-words">{booking.user.email}</p>
                  {contactPhone && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      {contactPhone}
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant/50 font-mono mt-0.5">Mã khách hàng #{booking.user.id}</p>
                </div>
                {(telHref || zaloPhone) && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {telHref && (
                      <a
                        href={`tel:${telHref}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        Gọi
                      </a>
                    )}
                    {zaloPhone && (
                      <a
                        href={`https://zalo.me/${zaloPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">chat</span>
                        Zalo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Tour */}
            {booking.tour && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">map</span>
                  Tour đã đặt
                </h3>
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                  <div className="w-16 h-14 rounded-xl overflow-hidden bg-surface-container shrink-0">
                    {booking.tour.imageUrl
                      ? (
                        <Image
                          src={booking.tour.imageUrl}
                          alt={booking.tour.name}
                          width={64}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      )
                      : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-outline">image</span></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-on-surface truncate">{booking.tour.name}</p>
                    {booking.tour.destination && (
                      <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {booking.tour.destination.name}
                      </p>
                    )}
                    <p className="text-xs font-mono text-on-surface-variant/50 mt-0.5">{booking.tour.tourCode}</p>
                    {booking.departureDate && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        Khởi hành {fmtDate(booking.departureDate)}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">payments</span>
                Thanh toán & hoàn tiền
              </h3>
              <div className="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low">
                <div className="grid divide-y divide-outline-variant/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="px-4 py-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Tổng tiền</p>
                    <p className="mt-1 text-lg font-extrabold text-primary">{fmt(booking.totalPrice)}</p>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Số khách</p>
                    <p className="mt-1 text-sm font-bold text-on-surface">{booking.numberOfPeople} khách</p>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Phương thức</p>
                    <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${mc.badge}`}>
                      <span className="material-symbols-outlined text-[13px]">{mc.icon}</span>
                      {mc.label}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/10 bg-surface/70">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <span className="text-sm text-on-surface-variant">Trạng thái thanh toán</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${pc.badge}`}>
                      <span className="material-symbols-outlined text-[13px]">{pc.icon}</span>
                      {pc.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <span className="text-sm text-on-surface-variant">Đơn giá tại thời điểm đặt</span>
                    <span className="font-semibold text-on-surface">{fmt(booking.unitPriceAtBooking)}/khách</span>
                  </div>
                  {hasDiscount && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                      <span className="text-sm text-on-surface-variant">Tạm tính trước ưu đãi</span>
                      <span className="font-semibold text-on-surface">{fmt(subtotalBeforeDiscount)}</span>
                    </div>
                  )}
                  {(booking.voucherCode || hasDiscount) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-sm text-on-surface-variant">Voucher áp dụng</span>
                        {booking.voucherCode && (
                          <span className="truncate rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">{booking.voucherCode}</span>
                        )}
                      </div>
                      <span className="shrink-0 font-semibold text-emerald-600">
                        {hasDiscount ? `- ${fmt(discountAmount)}` : 'Không giảm'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <span className="text-sm text-on-surface-variant">Phí hủy</span>
                    <span className="font-semibold text-on-surface">
                      {cancellationFee == null
                        ? isRefundRelevant && booking.paymentStatus === 'PAID'
                          ? 'Chưa xác định'
                          : 'Không phát sinh'
                        : fmt(cancellationFee)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <span className="text-sm text-on-surface-variant">Hoàn tiền</span>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${refundStatus.badge}`}>
                        <span className="material-symbols-outlined text-[13px]">{refundStatus.icon}</span>
                        {refundStatus.label}
                      </span>
                      <p className="mt-1 text-sm font-bold text-on-surface">
                        {hasRefundAmount ? fmt(refundAmount) : isRefundRelevant ? 'Chưa xác định' : fmt(0)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 px-5 py-3.5 text-xs text-on-surface-variant sm:grid-cols-3">
                    <div>
                      <p className="font-bold text-on-surface">Thanh toán</p>
                      <p className="mt-1">{paymentRecordedAt ? fmtDateTime(paymentRecordedAt) : 'Chưa ghi nhận'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Hủy đơn</p>
                      <p className="mt-1">{booking.cancelledAt ? fmtDateTime(booking.cancelledAt) : 'Không phát sinh'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Hoàn tiền</p>
                      <p className="mt-1">{booking.refundedAt ? fmtDateTime(booking.refundedAt) : 'Chưa ghi nhận'}</p>
                    </div>
                  </div>
                  {booking.refundNote && (
                    <p className="px-5 py-3.5 text-xs leading-5 text-on-surface-variant">{booking.refundNote}</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">policy</span>
                Chính sách hủy
              </h3>
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Điều kiện áp dụng hiện tại</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{cancellationPolicy.condition}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cancellationPolicy.statusTone}`}>
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>
                    {cancellationPolicy.statusLabel}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-surface/70 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Hoàn dự kiến</p>
                    <p className="mt-1 text-sm font-extrabold text-on-surface">{cancellationPolicy.refundLabel}</p>
                  </div>
                  <div className="rounded-xl bg-surface/70 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Mốc hạn</p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">{cancellationPolicy.deadline}</p>
                  </div>
                  <div className="rounded-xl bg-surface/70 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Khởi hành</p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">{fmtDate(booking.departureDate)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-outline-variant/10 bg-surface/70 p-3">
                  <p className="text-xs font-bold text-on-surface">Quy tắc tham chiếu</p>
                  <div className="mt-2 grid gap-2 text-xs leading-5 text-on-surface-variant sm:grid-cols-2">
                    <p>Trong 24 giờ sau khi đặt: hoàn 100% nếu đơn đã thanh toán.</p>
                    <p>Trước khởi hành từ 7 ngày: hoàn 80%.</p>
                    <p>Trước khởi hành từ 3 đến dưới 7 ngày: hoàn 50%.</p>
                    <p>Dưới 3 ngày hoặc ngày khởi hành: không hoàn theo mặc định.</p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-on-surface-variant">{cancellationPolicy.note}</p>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[14px]">route</span>
                Tiến trình xử lý
              </h3>
              <div className="space-y-2">
                {bookingTimeline.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${timelineToneClass[item.tone]}`}>
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                      </div>
                      {index < bookingTimeline.length - 1 && <div className="mt-1 h-7 w-px bg-outline-variant/30" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-on-surface">{item.title}</p>
                        <p className="text-[11px] text-on-surface-variant/60">{item.time ? fmtDateTime(item.time) : 'Chưa có mốc thời gian'}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border border-outline-variant/20 bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          <span className="material-symbols-outlined text-[12px]">person_check</span>
                          Nguồn: {item.actor}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-on-surface-variant">{item.description}</p>
                      {item.note && (
                        <p className="mt-1 rounded-lg bg-surface-container-low px-3 py-2 text-xs leading-5 text-on-surface-variant">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {adminNote && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">edit_note</span>
                  Ghi chú nội bộ
                </h3>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  {adminNote}
                </div>
              </section>
            )}

            {latestPaymentRequest && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">qr_code_2</span>
                  Yêu cầu thanh toán
                </h3>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-200 bg-white text-blue-700">
                      {latestPaymentRequest.channel}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      latestPaymentRequest.status === 'FAILED'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : latestPaymentRequest.status === 'SENT'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {latestPaymentRequest.status}
                    </span>
                  </div>
                  {latestPaymentRequest.errorMessage && (
                    <p className="mt-3 text-xs font-semibold text-red-600">{latestPaymentRequest.errorMessage}</p>
                  )}
                  {latestPaymentRequest.paymentUrl && (
                    <a
                      href={latestPaymentRequest.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Mở link thanh toán
                    </a>
                  )}
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 border border-blue-100">
                    {latestPaymentRequest.content}
                  </pre>
                </div>
              </section>
            )}

            {/* ── Payment Timeline ── */}
            {visibleTransactions.length > 0 && (
              <section id="booking-payment-history">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">timeline</span>
                  Lịch sử giao dịch
                </h3>
                <div className="space-y-2">
                  {visibleTransactions.map((tx) => {
                    const displayStatus = tx.status;
                    const isSuccess = displayStatus === 'SUCCESS';
                    const isFailed = displayStatus === 'FAILED';
                    const srcLabel = CONFIRMED_SOURCE_LABEL[tx.confirmedSource ?? ''] ?? tx.confirmedSource ?? null;
                    const statusLabel = isSuccess ? 'Đã ghi nhận' : isFailed ? 'Không hiệu lực' : 'Chờ thanh toán';
                    return (
                      <div key={tx.id} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${isSuccess ? 'bg-emerald-50 border-emerald-100' : isFailed ? 'bg-red-50 border-red-100' : 'bg-surface-container border-outline-variant/10'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSuccess ? 'bg-emerald-100' : isFailed ? 'bg-red-100' : 'bg-amber-100'}`}>
                          <span className={`material-symbols-outlined text-[14px] ${isSuccess ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-amber-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isSuccess ? 'check_circle' : isFailed ? 'cancel' : 'pending'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-on-surface">{tx.gateway} · {statusLabel}</span>
                            <span className={`font-bold ${isSuccess ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-amber-600'}`}>{fmt(tx.amount)}</span>
                          </div>
                          {tx.transactionRef && <p className="text-on-surface-variant/60 font-mono mt-0.5 truncate">Ref: {tx.transactionRef}</p>}
                          {srcLabel && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-white/70 border border-outline-variant/20 text-on-surface-variant font-medium">
                              <span className="material-symbols-outlined text-[11px]">info</span>{srcLabel}
                            </span>
                          )}
                          {tx.confirmedNote && <p className="mt-1 text-on-surface-variant/70 italic line-clamp-2">{tx.confirmedNote}</p>}
                          <p className="mt-1 text-on-surface-variant/50">{fmtDateTime(tx.confirmedAt ?? tx.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Support Tickets ── */}
            {booking.supportTickets && booking.supportTickets.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[14px]">support_agent</span>
                  Ticket hỗ trợ thanh toán
                </h3>
                <div className="space-y-2">
                  {booking.supportTickets.map((ticket) => {
                    const isOpen = ['NEW', 'IN_PROGRESS'].includes(ticket.status);
                    return (
                      <div key={ticket.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs ${isOpen ? 'bg-purple-50 border-purple-100' : 'bg-surface-container border-outline-variant/10'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${isOpen ? 'text-purple-600 animate-pulse' : 'text-outline'}`}>
                          {isOpen ? 'support_agent' : 'task_alt'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface truncate">{ticket.subject ?? `Ticket #${ticket.id}`}</p>
                          <p className="text-on-surface-variant/50 mt-0.5">{fmtDateTime(ticket.createdAt)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${isOpen ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {ticket.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        </div>


        {/* ── Footer — context-aware theo paymentMethod ── */}
        <div className="max-h-[42vh] shrink-0 overflow-y-auto overscroll-contain border-t border-outline-variant/10 bg-surface-container-lowest/50 px-6 py-4">

          {/* Error banner */}
          {actionError && (
            <div className="mb-3 px-4 py-2.5 bg-error/10 text-error rounded-xl text-sm font-medium border border-error/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {actionError}
              <button onClick={() => setActionError('')} className="ml-auto opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
          )}
          {actionSuccess && (
            <div className="mb-3 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {actionSuccess}
              <button onClick={() => setActionSuccess('')} className="ml-auto opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBookingCode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/20 bg-white px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              Sao chép mã đơn
            </button>
            {hasPaymentRequestContent && (
              <button
                type="button"
                onClick={handleCopyPaymentRequest}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <span className="material-symbols-outlined text-[15px]">request_quote</span>
                Copy thanh toán
              </button>
            )}
            {canResendPaymentRequest && (
              <>
                <button
                  type="button"
                  onClick={() => void handleResendPaymentRequest(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <span className="material-symbols-outlined text-[15px]">notifications_active</span>
                  Gửi lại thông báo
                </button>
                <button
                  type="button"
                  onClick={() => void handleResendPaymentRequest(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <span className="material-symbols-outlined text-[15px]">mail</span>
                  Gửi email
                </button>
              </>
            )}
            {visibleTransactions.length > 0 && (
              <button
                type="button"
                onClick={handleViewPaymentHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <span className="material-symbols-outlined text-[15px]">manage_search</span>
                Xem lịch sử thanh toán
              </button>
            )}
            {(booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') && (
              <button
                type="button"
                onClick={handleCreateAgain}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="material-symbols-outlined text-[15px]">add_circle</span>
                Tạo lại đơn
              </button>
            )}
          </div>

          {/* ── CASE: ĐÃ THANH TOÁN ── */}
          {booking.paymentStatus === 'PAID' ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <div>
                  <p className="text-sm font-bold">Đã thanh toán</p>
                  {booking.transactions?.[0]?.confirmedSource && (
                    <p className="text-xs text-emerald-600/70">
                      {CONFIRMED_SOURCE_LABEL[booking.transactions[0].confirmedSource] ?? booking.transactions[0].confirmedSource}
                      {booking.transactions[0].confirmedAt && ` · ${fmtDateTime(booking.transactions[0].confirmedAt)}`}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
            </div>
          ) : isPending && isUnpaidOrProcessing ? (
            /* ── CASE: PENDING + chờ thanh toán ── */
            <div className="space-y-3">

              {/* Badge phương thức thanh toán */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${mc.badge}`}>
                  <span className="material-symbols-outlined text-[13px]">{mc.icon}</span>
                  {mc.label}
                </span>
                {booking.paymentStatus === 'PROCESSING' && openPaymentTicket && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <span className="material-symbols-outlined text-[13px]">support_agent</span>
                    Ticket #{openPaymentTicket.id} đang mở
                  </span>
                )}
              </div>

              {/* IN_STORE actions */}
              {booking.paymentMethod === 'IN_STORE' && !showInStoreForm && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setShowInStoreForm(true); setActionError(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span>
                    Ghi nhận thu tại quầy
                  </button>
                  <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
                </div>
              )}

              {/* IN_STORE form */}
              {booking.paymentMethod === 'IN_STORE' && showInStoreForm && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">storefront</span>
                    Ghi nhận thu tại cửa hàng
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 mb-1.5 block">Cách thu tiền</label>
                    <div className="flex gap-2 flex-wrap">
                      {([['CASH','Tiền mặt','payments'],['BANK_TRANSFER','Chuyển khoản','account_balance'],['CARD_POS','Thẻ POS','credit_card']] as const).map(([val,lbl,ico]) => (
                        <button key={val} onClick={() => setInStoreMethod(val)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${inStoreMethod === val ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'}`}>
                          <span className="material-symbols-outlined text-[14px]">{ico}</span>{lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 mb-1 block">Mã biên nhận / ghi chú (tùy chọn)</label>
                    <input value={inStoreRef} onChange={e => setInStoreRef(e.target.value)} placeholder="VD: BILL-2024-001..."
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 mb-1 block">Ghi chú nội bộ (tùy chọn)</label>
                    <input value={inStoreNote} onChange={e => setInStoreNote(e.target.value)} placeholder="Ghi chú thêm..."
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setShowInStoreForm(false); setActionError(''); }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">
                      Hủy
                    </button>
                    <button onClick={handleConfirmInStore} disabled={isConfirmingInStore}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
                      {isConfirmingInStore ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</> : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Xác nhận đã thu</>}
                    </button>
                  </div>
                </div>
              )}

              {/* PayOS actions */}
              {booking.paymentMethod === 'PAYOS' && !showReconcileForm && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleSyncPayos} disabled={isSyncingPayos}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60 transition-colors outline-none">
                      <span className={`material-symbols-outlined text-[16px] ${isSyncingPayos ? 'animate-spin' : ''}`}>sync</span>
                      {isSyncingPayos ? 'Đang kiểm tra…' : 'Kiểm tra PayOS'}
                    </button>
                    <button onClick={() => { setShowReconcileForm(true); setActionError(''); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors outline-none">
                      <span className="material-symbols-outlined text-[16px]">find_in_page</span>
                      Đối soát thủ công
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
                  </div>
                </div>
              )}

              {/* PayOS reconcile form */}
              {booking.paymentMethod === 'PAYOS' && showReconcileForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    Đối soát thanh toán thủ công
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-1 block">Mã tham chiếu giao dịch <span className="text-error">*</span></label>
                    <input value={reconcileTxRef} onChange={e => setReconcileTxRef(e.target.value)} placeholder="VD: VCB12345678..."
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-1 block">Ghi chú xác nhận <span className="text-error">*</span></label>
                    <textarea value={reconcileNote} onChange={e => setReconcileNote(e.target.value)} rows={2} placeholder="VD: Đã xem ảnh CK khớp với hóa đơn, xác nhận thu đủ 5.500.000đ..."
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 resize-none" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setShowReconcileForm(false); setActionError(''); }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">
                      Hủy
                    </button>
                    <button onClick={handleReconcile} disabled={isReconciling}
                      className="flex-1 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 outline-none">
                      {isReconciling ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Đang lưu…</> : <><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>Xác nhận đối soát</>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* ── CASE: Đã xác nhận hoặc huỷ ── */
            <div className="flex justify-end">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container transition-colors outline-none">Đóng</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
