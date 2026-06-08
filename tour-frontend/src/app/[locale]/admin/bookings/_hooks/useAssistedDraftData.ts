'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { hasLoadedBookingOptions } from '../_lib/helpers';
import type { AssistedDraft, TourOption } from '../_lib/types';

interface UseAssistedDraftDataParams {
  statusFilter: string;
  search: string;
  formTourId: string;
  showToast: (msg: string, ok?: boolean) => void;
}

export function useAssistedDraftData({
  statusFilter,
  search,
  formTourId,
  showToast,
}: UseAssistedDraftDataParams) {
  const [drafts, setDrafts] = useState<AssistedDraft[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (search) qs.set('search', search);
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/admin/assisted-drafts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Load failed');
      const payload = json?.data ?? json;
      setDrafts(Array.isArray(payload) ? payload : []);
    } catch {
      showToast('Không tải được danh sách bản nháp đặt hộ', false);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/auth/profile`)
      .then(r => r.json())
      .then(json => {
        const data = json?.data ?? json;
        setRole(String(data?.role ?? ''));
      })
      .catch(() => setRole(''));
  }, []);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/tour?limit=100&sortBy=recommended`)
      .then(r => r.json())
      .then(json => {
        const payload = json?.data ?? json;
        setTours(Array.isArray(payload) ? payload : (payload?.data ?? []));
      })
      .catch(() => showToast('Không tải được danh sách tour', false));
  }, [showToast]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  useEffect(() => {
    const tourId = Number(formTourId);
    if (!tourId) return;
    const current = tours.find(t => t.id === tourId);
    if (hasLoadedBookingOptions(current)) return;
    fetchWithAuth(`${API_BASE_URL}/tour/${tourId}`)
      .then(r => r.json())
      .then(json => {
        const detail = json?.data ?? json;
        setTours(prev => prev.map(t => t.id === tourId ? { ...t, ...detail } : t));
      })
      .catch(() => {});
  }, [formTourId, tours]);

  return { drafts, setDrafts, tours, role, isLoading, fetchDrafts };
}
