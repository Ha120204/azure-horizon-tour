'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAutoRefresh } from '@/hooks/admin/useAdminAutoRefresh';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { EMPTY_CAMPAIGN_FORM, EMPTY_STATS } from '../_lib/config';
import { exportSubscribersCsv } from '../_lib/exportCsv';
import {
  buildLocalScheduleValue,
  getErrorMessage,
  getLocalDatePart,
  normalizeTimeInput,
  toDateTimeLocalValue,
} from '../_lib/helpers';
import type {
  BackendMarketingCampaign,
  CampaignDraft,
  CampaignErrors,
  CampaignForm,
  CampaignType,
  Meta,
  Subscriber,
  SubscriberStats,
  SubscriberStatus,
} from '../_lib/types';
import { toastEmitter } from '@/lib/http/toastEmitter';

const CAMPAIGN_TYPES: CampaignType[] = ['PROMOTION', 'TRAVEL_STORY', 'NEWSLETTER'];

const toCampaignDraft = (campaign: BackendMarketingCampaign): CampaignDraft => ({
  id: campaign.id,
  name: campaign.campaignName,
  type: CAMPAIGN_TYPES.includes(campaign.type as CampaignType)
    ? campaign.type as CampaignType
    : 'NEWSLETTER',
  subject: campaign.subject,
  previewText: campaign.previewText ?? '',
  body: campaign.body,
  audience: campaign.audience,
  audienceFilter: campaign.audienceFilter,
  selectedSubscriberIds: campaign.recipientIds ?? campaign.audienceFilter?.recipientIds,
  recipientEstimate: campaign.recipientEstimate,
  createdAt: campaign.createdAt,
  updatedAt: campaign.updatedAt,
  scheduledAt: campaign.scheduledAt,
  sentAt: campaign.sentAt,
  cancelledAt: campaign.cancelledAt,
  processedCount: campaign.processedCount,
  sentCount: campaign.sentCount,
  failedCount: campaign.failedCount,
  errorMessage: campaign.errorMessage,
  status: campaign.status,
});

// Payload đối tượng nhận gửi xuống backend theo loại audience đã chọn
const buildAudiencePayload = (form: CampaignForm, status: SubscriberStatus, search: string) => {
  if (form.audience === 'CURRENT_FILTER') {
    return { audienceFilter: { status, search } };
  }
  if (form.audience === 'MANUAL_SELECTION') {
    return { recipientIds: form.selectedSubscriberIds };
  }
  return {};
};

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

  const [backendCampaigns, setBackendCampaigns] = useState<CampaignDraft[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(EMPTY_CAMPAIGN_FORM);
  const [campaignErrors, setCampaignErrors] = useState<CampaignErrors>({});
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [filteredActiveEstimate, setFilteredActiveEstimate] = useState(0);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [scheduleTarget, setScheduleTarget] = useState<CampaignDraft | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleHour, setScheduleHour] = useState('09');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleError, setScheduleError] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [cancelCampaignTarget, setCancelCampaignTarget] = useState<CampaignDraft | null>(null);
  const [isCancellingCampaign, setIsCancellingCampaign] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') toastEmitter.error(message);
    else toastEmitter.success(message);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaigns`);
    if (!res.ok) throw new Error('Không thể tải danh sách chiến dịch');
    const json = await res.json();
    const campaigns = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];
    setBackendCampaigns((campaigns as BackendMarketingCampaign[]).map(toCampaignDraft));
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
        fetchCampaigns(),
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
  }, [debouncedSearch, fetchCampaigns, fetchStats, limit, page, showToast, status]);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  useAdminAutoRefresh({
    intervalMs: 90 * 1000,
    pause: Boolean(composerOpen || deleteTarget || scheduleTarget || cancelCampaignTarget || isDeleting || isSendingTest || isScheduling || isCancellingCampaign || isSavingCampaign || loadingId),
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

  const campaignDrafts = useMemo(
    () => [...backendCampaigns]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [backendCampaigns],
  );

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

  const saveCampaignDraft = useCallback(async () => {
    if (isSavingCampaign) return;
    const nextErrors: CampaignErrors = {};
    if (!campaignForm.name.trim()) nextErrors.name = 'Nhập tên chiến dịch để dễ quản lý bản nháp.';
    if (!campaignForm.subject.trim()) nextErrors.subject = 'Nhập tiêu đề email hiển thị trong hộp thư khách hàng.';
    if (!campaignForm.body.trim()) nextErrors.body = 'Nhập nội dung chính của email.';
    if (campaignForm.audience === 'MANUAL_SELECTION' && campaignForm.selectedSubscriberIds.length === 0) {
      nextErrors.audience = 'Chọn ít nhất một người đăng ký đang nhận tin.';
    }
    setCampaignErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      campaignName: campaignForm.name.trim(),
      type: campaignForm.type,
      subject: campaignForm.subject.trim(),
      previewText: campaignForm.previewText.trim(),
      body: campaignForm.body.trim(),
      audience: campaignForm.audience,
      ...buildAudiencePayload(campaignForm, status, debouncedSearch),
    };

    setIsSavingCampaign(true);
    try {
      const res = editingCampaignId
        ? await fetchWithAuth(`${API_BASE_URL}/subscriber/campaigns/${encodeURIComponent(editingCampaignId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetchWithAuth(`${API_BASE_URL}/subscriber/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || 'Lưu bản nháp thất bại');
      await fetchCampaigns();
      setComposerOpen(false);
      setEditingCampaignId(null);
      setCampaignForm(EMPTY_CAMPAIGN_FORM);
      setCampaignErrors({});
      showToast('Đã lưu bản nháp chiến dịch');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Lưu bản nháp thất bại'), 'error');
    } finally {
      setIsSavingCampaign(false);
    }
  }, [campaignForm, debouncedSearch, editingCampaignId, fetchCampaigns, isSavingCampaign, showToast, status]);

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

  const deleteCampaignDraft = useCallback(async (id: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaigns/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Xóa bản nháp thất bại');
      }
      await fetchCampaigns();
      showToast('Đã xóa bản nháp chiến dịch');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Xóa bản nháp thất bại'), 'error');
    }
  }, [fetchCampaigns, showToast]);

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
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaigns/${encodeURIComponent(scheduleTarget.id)}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || 'Lên lịch gửi thất bại');
      await fetchCampaigns();
      setScheduleTarget(null);
      showToast('Đã lên lịch gửi chiến dịch');
    } catch (error: unknown) {
      setScheduleError(getErrorMessage(error, 'Lên lịch gửi thất bại'));
    } finally {
      setIsScheduling(false);
    }
  }, [fetchCampaigns, scheduleDate, scheduleHour, scheduleMinute, scheduleTarget, showToast]);

  const cancelScheduledCampaign = useCallback(async () => {
    if (!cancelCampaignTarget) return;
    setIsCancellingCampaign(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaigns/${encodeURIComponent(cancelCampaignTarget.id)}/cancel`, {
        method: 'PATCH',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || 'Hủy lịch gửi thất bại');
      await fetchCampaigns();
      setCancelCampaignTarget(null);
      showToast('Đã hủy lịch gửi chiến dịch');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Hủy lịch gửi thất bại'), 'error');
    } finally {
      setIsCancellingCampaign(false);
    }
  }, [cancelCampaignTarget, fetchCampaigns, showToast]);

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
    cancelCampaignTarget,
    isCancellingCampaign,
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
    setCancelCampaignTarget,
    openCreateCampaign,
    openEditCampaign,
    saveCampaignDraft,
    sendTestCampaign,
    deleteCampaignDraft,
    openScheduleCampaign,
    scheduleCampaign,
    cancelScheduledCampaign,
    toggleStatusFilter,
    changeStatus,
    handleToggleActive,
    confirmDelete,
    exportCsv,
    changePageSize,
  };
}
