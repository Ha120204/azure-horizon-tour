'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import type { VoucherDetail, VoucherAnalytics, UserVoucherEntry } from './types';
import { statusConfig, formatCurrency } from './utils';

export function useVoucherDetail(voucherId: number | null, onClose: () => void) {
  const [data, setData] = useState<VoucherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (voucherId !== null) {
      setData(null);
      setError('');
      const timer = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(timer);
    }
    setVisible(false);
    return undefined;
  }, [voucherId]);

  useEffect(() => {
    if (voucherId !== null) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [voucherId]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 250);
  }, [onClose]);

  const fetchDetail = useCallback(async () => {
    if (!voucherId) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/voucher/admin/${voucherId}`);
      if (!response.ok) throw new Error('Không thể tải chi tiết voucher');
      const json = await response.json();
      setData(json?.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  }, [voucherId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleCopy = () => {
    if (!data?.code) return;
    navigator.clipboard?.writeText(data.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const usedCount = Number(data?.usedCount) || 0;
  const maxUses = Number(data?.maxUses) || 999_999_999;
  const isUnlimited = maxUses >= 999_999_999;
  const usageRatio = isUnlimited ? (usedCount > 0 ? 0.06 : 0) : Math.min(usedCount / maxUses, 1);
  const savedCount = data?._count?.userVouchers ?? 0;
  const userVouchers: UserVoucherEntry[] = data?.userVouchers ?? [];
  const analytics: VoucherAnalytics | undefined = data?.analytics;
  const status = data?.computedStatus ? statusConfig[data.computedStatus] : null;
  const heroGradient = status?.gradient ?? statusConfig.active.gradient;
  const discountValue = Number(data?.discountValue);
  const discountDisplay = data
    ? data.discountType === 'PERCENTAGE'
      ? `${Number.isNaN(discountValue) ? '—' : discountValue}%`
      : formatCurrency(discountValue)
    : '';
  const progressColor = usageRatio >= 1 ? '#ef4444' : usageRatio >= 0.8 ? '#f59e0b' : '#3b82f6';

  return {
    data,
    isLoading,
    error,
    visible,
    copied,
    handleClose,
    fetchDetail,
    handleCopy,
    usedCount,
    maxUses,
    isUnlimited,
    usageRatio,
    savedCount,
    userVouchers,
    analytics,
    status,
    heroGradient,
    discountDisplay,
    progressColor,
  };
}
