'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import {
  CAMPAIGN_DRAFTS_KEY,
  EMPTY_CAMPAIGN_FORM,
  EMPTY_STATS,
} from '../_lib/config';
import { exportSubscribersCsv } from '../_lib/exportCsv';
import {
  buildLocalScheduleValue,
  getErrorMessage,
  getLocalDatePart,
  normalizeTimeInput,
  toDateTimeLocalValue,
} from '../_lib/helpers';
import type {
  CampaignDraft,
  CampaignErrors,
  CampaignForm,
  Meta,
  Subscriber,
  SubscriberStats,
  SubscriberStatus,
  ToastState,
} from '../_lib/types';

export function useMarketingManagement() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<SubscriberStats>(EMPTY_STATS);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<SubscriberStatus>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [campaignDrafts, setCampaignDrafts] = useState<CampaignDraft[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(EMPTY_CAMPAIGN_FORM);
  const [campaignErrors, setCampaignErrors] = useState<CampaignErrors>({});
  const [filteredActiveEstimate, setFilteredActiveEstimate] = useState(0);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [scheduleTarget, setScheduleTarget] = useState<CampaignDraft | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleHour, setScheduleHour] = useState('09');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleError, setScheduleError] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CAMPAIGN_DRAFTS_KEY);
      if (saved) setCampaignDrafts(JSON.parse(saved) as CampaignDraft[]);
    } catch {
      setCampaignDrafts([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/stats`);
    if (!res.ok) throw new Error('Không thể tải KPI người đăng ký');
    const json = await res.json();
    setStats({ ...EMPTY_STATS, ...(json?.data ?? json) });
  }, []);

  const fetchSubscribers = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (status !== 'all') qs.set('status', status);

      const [listRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/subscriber?${qs}`),
        fetchStats(),
      ]);
      if (!listRes.ok) throw new Error('Không thể tải danh sách người đăng ký');
      const json = await listRes.json();
      setSubscribers(Array.isArray(json?.data) ? json.data : []);
      if (json?.meta) {
        setMeta({
          total: json.meta.total ?? 0,
          page: json.meta.page ?? page,
          limit: json.meta.limit ?? limit,
          totalPages: json.meta.totalPages ?? 1,
        });
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Lỗi tải dữ liệu tiếp thị'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, fetchStats, limit, page, showToast, status]);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  useAdminAutoRefresh({
    intervalMs: 90 * 1000,
    pause: Boolean(composerOpen || deleteTarget || scheduleTarget || isDeleting || isSendingTest || isScheduling || loadingId),
    onRefresh: fetchSubscribers,
  });

  const filteredSummary = useMemo(() => {
    if (status === 'active') return `${stats.active.toLocaleString('vi-VN')} email đang nhận tin`;
    if (status === 'inactive') return `${stats.inactive.toLocaleString('vi-VN')} email đã tạm dừng`;
    return `${stats.total.toLocaleString('vi-VN')} người đăng ký trong hệ thống`;
  }, [stats.active, stats.inactive, stats.total, status]);

  useEffect(() => {
    if (status !== 'all' || !debouncedSearch) {
      setFilteredActiveEstimate(0);
      return;
    }

    let ignored = false;
    const loadEstimate = async () => {
      try {
        const qs = new URLSearchParams({
          page: '1',
          limit: '1',
          status: 'active',
          search: debouncedSearch,
        });
        const res = await fetchWithAuth(`${API_BASE_URL}/subscriber?${qs}`);
        const json = await res.json();
        if (!ignored) setFilteredActiveEstimate(Number(json?.meta?.total ?? 0));
      } catch {
        if (!ignored) setFilteredActiveEstimate(0);
      }
    };

    void loadEstimate();
    return () => { ignored = true; };
  }, [debouncedSearch, status]);

  const currentFilterRecipientEstimate = useMemo(() => {
    if (status === 'inactive') return 0;
    if (status === 'active') return meta.total;
    if (debouncedSearch) return filteredActiveEstimate;
    return stats.active;
  }, [debouncedSearch, filteredActiveEstimate, meta.total, stats.active, status]);

  const recipientEstimate = useMemo(() => {
    if (campaignForm.audience === 'MANUAL_SELECTION') {
      return campaignForm.selectedSubscriberIds.length;
    }
    if (campaignForm.audience === 'CURRENT_FILTER') {
      return currentFilterRecipientEstimate;
    }
    return stats.active;
  }, [campaignForm.audience, campaignForm.selectedSubscriberIds.length, currentFilterRecipientEstimate, stats.active]);

  const persistCampaignDrafts = useCallback((next: CampaignDraft[]) => {
    setCampaignDrafts(next);
    window.localStorage.setItem(CAMPAIGN_DRAFTS_KEY, JSON.stringify(next));
  }, []);

  const openCreateCampaign = useCallback(() => {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCampaignErrors({});
    setTestEmail('');
    setComposerOpen(true);
  }, []);

  const openEditCampaign = useCallback((draft: CampaignDraft) => {
    setEditingCampaignId(draft.id);
    setCampaignForm({
      name: draft.name,
      type: draft.type,
      subject: draft.subject,
      previewText: draft.previewText,
      body: draft.body,
      audience: draft.audience,
      selectedSubscriberIds: draft.selectedSubscriberIds ?? draft.audienceFilter?.recipientIds ?? [],
      selectedSubscriberEmails: draft.selectedSubscriberEmails ?? [],
    });
    setCampaignErrors({});
    setComposerOpen(true);
  }, []);

  const saveCampaignDraft = useCallback(() => {
    const nextErrors: CampaignErrors = {};
    if (!campaignForm.name.trim()) nextErrors.name = 'Nhập tên chiến dịch để dễ quản lý bản nháp.';
    if (!campaignForm.subject.trim()) nextErrors.subject = 'Nhập tiêu đề email hiển thị trong hộp thư khách hàng.';
    if (!campaignForm.body.trim()) nextErrors.body = 'Nhập nội dung chính của email.';
    if (campaignForm.audience === 'MANUAL_SELECTION' && campaignForm.selectedSubscriberIds.length === 0) {
      nextErrors.audience = 'Chọn ít nhất một người đăng ký đang nhận tin.';
    }
    setCampaignErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const now = new Date().toISOString();
    const nextDraft: CampaignDraft = {
      id: editingCampaignId ?? `campaign_${Date.now()}`,
      name: campaignForm.name.trim(),
      type: campaignForm.type,
      subject: campaignForm.subject.trim(),
      previewText: campaignForm.previewText.trim(),
      body: campaignForm.body.trim(),
      audience: campaignForm.audience,
      audienceFilter: campaignForm.audience === 'CURRENT_FILTER'
        ? { status, search: debouncedSearch }
        : campaignForm.audience === 'MANUAL_SELECTION'
          ? { recipientIds: campaignForm.selectedSubscriberIds }
          : undefined,
      selectedSubscriberIds: campaignForm.audience === 'MANUAL_SELECTION'
        ? campaignForm.selectedSubscriberIds
        : undefined,
      selectedSubscriberEmails: campaignForm.audience === 'MANUAL_SELECTION'
        ? campaignForm.selectedSubscriberEmails
        : undefined,
      recipientEstimate,
      createdAt: campaignDrafts.find(draft => draft.id === editingCampaignId)?.createdAt ?? now,
      updatedAt: now,
      status: 'DRAFT',
    };
    const nextDrafts = editingCampaignId
      ? campaignDrafts.map(draft => draft.id === editingCampaignId ? nextDraft : draft)
      : [nextDraft, ...campaignDrafts];
    persistCampaignDrafts(nextDrafts);
    setComposerOpen(false);
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCampaignErrors({});
    showToast('Đã lưu bản nháp chiến dịch');
  }, [campaignDrafts, campaignForm, debouncedSearch, editingCampaignId, persistCampaignDrafts, recipientEstimate, showToast, status]);

  const sendTestCampaign = useCallback(async () => {
    const nextErrors: CampaignErrors = {};
    if (!testEmail.trim() || !testEmail.includes('@')) nextErrors.testEmail = 'Nhập email gửi thử hợp lệ.';
    if (!campaignForm.subject.trim()) nextErrors.subject = 'Nhập tiêu đề trước khi gửi thử.';
    if (!campaignForm.body.trim()) nextErrors.body = 'Nhập nội dung email trước khi gửi thử.';
    setCampaignErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSendingTest(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaign/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail.trim(),
          campaignName: campaignForm.name.trim() || 'Chiến dịch chưa đặt tên',
          subject: campaignForm.subject.trim(),
          previewText: campaignForm.previewText.trim(),
          body: campaignForm.body.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Gửi thử thất bại');
      }
      showToast(`Đã gửi email thử tới ${testEmail.trim()}`);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Gửi thử thất bại'), 'error');
    } finally {
      setIsSendingTest(false);
    }
  }, [campaignForm, showToast, testEmail]);

  const deleteCampaignDraft = useCallback((id: string) => {
    persistCampaignDrafts(campaignDrafts.filter(draft => draft.id !== id));
    showToast('Đã xóa bản nháp chiến dịch');
  }, [campaignDrafts, persistCampaignDrafts, showToast]);

  const openScheduleCampaign = useCallback((draft: CampaignDraft) => {
    const defaultDate = new Date(Date.now() + 10 * 60 * 1000);
    defaultDate.setSeconds(0, 0);
    const localValue = toDateTimeLocalValue(defaultDate);
    setScheduleTarget(draft);
    setScheduleDate(getLocalDatePart(localValue));
    setScheduleHour(localValue.slice(11, 13));
    setScheduleMinute(localValue.slice(14, 16));
    setScheduleError('');
  }, []);

  const scheduleCampaign = useCallback(async () => {
    if (!scheduleTarget) return;
    if (scheduleTarget.audience === 'MANUAL_SELECTION' && (scheduleTarget.selectedSubscriberIds?.length ?? 0) === 0) {
      setScheduleError('Chiến dịch chọn thủ công cần ít nhất một người đăng ký đang nhận tin.');
      return;
    }
    const normalizedHour = normalizeTimeInput(scheduleHour, 23);
    const normalizedMinute = normalizeTimeInput(scheduleMinute, 59);
    const localScheduledAt = buildLocalScheduleValue(scheduleDate, scheduleHour, scheduleMinute);
    if (!localScheduledAt) {
      setScheduleError('Chọn ngày giờ gửi chiến dịch.');
      return;
    }
    setScheduleHour(normalizedHour);
    setScheduleMinute(normalizedMinute);
    const scheduledAt = new Date(localScheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 30_000) {
      setScheduleError('Thời gian gửi phải sau hiện tại ít nhất 30 giây.');
      return;
    }

    setIsScheduling(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaign/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: scheduleTarget.name,
          type: scheduleTarget.type,
          subject: scheduleTarget.subject,
          previewText: scheduleTarget.previewText,
          body: scheduleTarget.body,
          audience: scheduleTarget.audience,
          audienceFilter: scheduleTarget.audienceFilter,
          recipientIds: scheduleTarget.selectedSubscriberIds ?? scheduleTarget.audienceFilter?.recipientIds,
          scheduledAt: scheduledAt.toISOString(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || 'Lên lịch gửi thất bại');
      const scheduledCampaign = json?.data ?? json;
      persistCampaignDrafts(campaignDrafts.map(draft => draft.id === scheduleTarget.id
        ? {
            ...draft,
            status: 'SCHEDULED',
            scheduledAt: scheduledCampaign.scheduledAt ?? scheduledAt.toISOString(),
            recipientEstimate: scheduledCampaign.recipientEstimate ?? draft.recipientEstimate,
            updatedAt: new Date().toISOString(),
          }
        : draft));
      setScheduleTarget(null);
      showToast('Đã lên lịch gửi chiến dịch');
    } catch (error: unknown) {
      setScheduleError(getErrorMessage(error, 'Lên lịch gửi thất bại'));
    } finally {
      setIsScheduling(false);
    }
  }, [campaignDrafts, persistCampaignDrafts, scheduleDate, scheduleHour, scheduleMinute, scheduleTarget, showToast]);

  const toggleStatusFilter = useCallback((next: SubscriberStatus) => {
    setStatus(current => current === next && next !== 'all' ? 'all' : next);
    setPage(1);
  }, []);

  const changeStatus = useCallback((next: SubscriberStatus) => {
    setStatus(next);
    setPage(1);
  }, []);

  const handleToggleActive = useCallback(async (subscriber: Subscriber) => {
    setLoadingId(subscriber.id);
    try {
      const nextActive = !subscriber.isActive;
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/${subscriber.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái người đăng ký');
      setSubscribers(prev => prev.map(item => item.id === subscriber.id ? { ...item, isActive: nextActive } : item));
      await fetchStats();
      showToast(nextActive ? 'Đã bật nhận tin cho email này' : 'Đã tạm dừng nhận tin');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Cập nhật thất bại'), 'error');
    } finally {
      setLoadingId(null);
    }
  }, [fetchStats, showToast]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa người đăng ký');
      setDeleteTarget(null);
      showToast('Đã xóa người đăng ký');
      await fetchSubscribers();
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Xóa người đăng ký thất bại'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, fetchSubscribers, showToast]);

  const exportCsv = useCallback(async () => {
    try {
      await exportSubscribersCsv({ search: debouncedSearch, status });
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Xuất CSV thất bại'), 'error');
    }
  }, [debouncedSearch, showToast, status]);

  const changePageSize = useCallback((next: number) => {
    setLimit(next);
    setPage(1);
  }, []);

  return {
    subscribers,
    stats,
    meta,
    search,
    status,
    page,
    limit,
    isLoading,
    loadingId,
    deleteTarget,
    isDeleting,
    toast,
    campaignDrafts,
    composerOpen,
    editingCampaignId,
    campaignForm,
    campaignErrors,
    testEmail,
    isSendingTest,
    scheduleTarget,
    scheduleDate,
    scheduleHour,
    scheduleMinute,
    scheduleError,
    isScheduling,
    filteredSummary,
    recipientEstimate,
    setSearch,
    setPage,
    setDeleteTarget,
    setComposerOpen,
    setCampaignForm,
    setCampaignErrors,
    setTestEmail,
    setScheduleDate,
    setScheduleHour,
    setScheduleMinute,
    setScheduleError,
    setScheduleTarget,
    openCreateCampaign,
    openEditCampaign,
    saveCampaignDraft,
    sendTestCampaign,
    deleteCampaignDraft,
    openScheduleCampaign,
    scheduleCampaign,
    toggleStatusFilter,
    changeStatus,
    handleToggleActive,
    confirmDelete,
    exportCsv,
    changePageSize,
  };
}
