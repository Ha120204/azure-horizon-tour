'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';

type SubscriberStatus = 'all' | 'active' | 'inactive';
type CampaignType = 'PROMOTION' | 'TRAVEL_STORY' | 'NEWSLETTER';
type AudienceType = 'ALL_ACTIVE' | 'CURRENT_FILTER';

interface Subscriber {
  id: number;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface SubscriberStats {
  total: number;
  active: number;
  inactive: number;
  thisMonth: number;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface CampaignDraft {
  id: string;
  name: string;
  type: CampaignType;
  subject: string;
  previewText: string;
  body: string;
  audience: AudienceType;
  audienceFilter?: { status?: SubscriberStatus; search?: string };
  recipientEstimate: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  sentAt?: string;
  sentCount?: number;
  failedCount?: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
}

interface CampaignForm {
  name: string;
  type: CampaignType;
  subject: string;
  previewText: string;
  body: string;
  audience: AudienceType;
}

interface CampaignErrors {
  name?: string;
  subject?: string;
  body?: string;
  testEmail?: string;
}

const EMPTY_STATS: SubscriberStats = { total: 0, active: 0, inactive: 0, thisMonth: 0 };
const CAMPAIGN_DRAFTS_KEY = 'azure_horizon_campaign_drafts';
const EMPTY_CAMPAIGN_FORM: CampaignForm = {
  name: '',
  type: 'PROMOTION',
  subject: '',
  previewText: '',
  body: '',
  audience: 'ALL_ACTIVE',
};

const statusOptions: { value: SubscriberStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang nhận tin' },
  { value: 'inactive', label: 'Đã tạm dừng' },
];

const campaignTypeConfig: Record<CampaignType, { label: string; icon: string; tone: string }> = {
  PROMOTION: { label: 'Khuyến mãi', icon: 'local_offer', tone: 'bg-amber-50 text-amber-700' },
  TRAVEL_STORY: { label: 'Câu chuyện du lịch', icon: 'auto_stories', tone: 'bg-blue-50 text-blue-700' },
  NEWSLETTER: { label: 'Newsletter tổng hợp', icon: 'newspaper', tone: 'bg-violet-50 text-violet-700' },
};

const campaignStatusConfig: Record<CampaignDraft['status'], { label: string; tone: string }> = {
  DRAFT: { label: 'DRAFT', tone: 'bg-slate-100 text-slate-600' },
  SCHEDULED: { label: 'ĐÃ LÊN LỊCH', tone: 'bg-blue-50 text-blue-700' },
  SENDING: { label: 'ĐANG GỬI', tone: 'bg-amber-50 text-amber-700' },
  SENT: { label: 'ĐÃ GỬI', tone: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'LỖI GỬI', tone: 'bg-rose-50 text-rose-700' },
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const escapeCsv = (value: string | number | boolean) =>
  `"${String(value).replaceAll('"', '""')}"`;

const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const getLocalDatePart = (value: string) => value.slice(0, 10);

const mergeLocalDateTime = (datePart: string, timePart: string) =>
  datePart && timePart ? `${datePart}T${timePart}` : '';

const sanitizeTimeInput = (value: string, max: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  return String(Math.min(Number(digits), max));
};

const normalizeTimeInput = (value: string, max: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  return String(Math.min(Number(digits), max)).padStart(2, '0');
};

const buildLocalScheduleValue = (datePart: string, hour: string, minute: string) => {
  const normalizedHour = normalizeTimeInput(hour, 23);
  const normalizedMinute = normalizeTimeInput(minute, 59);
  return datePart && normalizedHour && normalizedMinute
    ? mergeLocalDateTime(datePart, `${normalizedHour}:${normalizedMinute}`)
    : '';
};

export default function MarketingPage() {
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
    if (!res.ok) throw new Error('Không thể tải KPI subscriber');
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
      if (!listRes.ok) throw new Error('Không thể tải danh sách subscriber');
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
      showToast(getErrorMessage(error, 'Lỗi tải dữ liệu marketing'), 'error');
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
    return `${stats.total.toLocaleString('vi-VN')} subscriber trong hệ thống`;
  }, [stats.active, stats.inactive, stats.total, status]);

  const recipientEstimate = useMemo(() => {
    if (campaignForm.audience === 'CURRENT_FILTER') {
      if (status === 'inactive') return 0;
      return status === 'active' ? meta.total : stats.active;
    }
    return stats.active;
  }, [campaignForm.audience, meta.total, stats.active, status]);

  const schedulePreviewAt = useMemo(() => {
    const localValue = buildLocalScheduleValue(scheduleDate, scheduleHour, scheduleMinute);
    if (!localValue) return '';
    const date = new Date(localValue);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }, [scheduleDate, scheduleHour, scheduleMinute]);

  const openCreateCampaign = () => {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCampaignErrors({});
    setTestEmail('');
    setComposerOpen(true);
  };

  const openEditCampaign = (draft: CampaignDraft) => {
    setEditingCampaignId(draft.id);
    setCampaignForm({
      name: draft.name,
      type: draft.type,
      subject: draft.subject,
      previewText: draft.previewText,
      body: draft.body,
      audience: draft.audience,
    });
    setCampaignErrors({});
    setComposerOpen(true);
  };

  const persistCampaignDrafts = (next: CampaignDraft[]) => {
    setCampaignDrafts(next);
    window.localStorage.setItem(CAMPAIGN_DRAFTS_KEY, JSON.stringify(next));
  };

  const saveCampaignDraft = () => {
    const nextErrors: CampaignErrors = {};
    if (!campaignForm.name.trim()) nextErrors.name = 'Nhập tên campaign để dễ quản lý bản nháp.';
    if (!campaignForm.subject.trim()) nextErrors.subject = 'Nhập subject email hiển thị trong hộp thư khách hàng.';
    if (!campaignForm.body.trim()) nextErrors.body = 'Nhập nội dung chính của email.';
    setCampaignErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

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
    showToast('Đã lưu bản nháp campaign');
  };

  const sendTestCampaign = async () => {
    const nextErrors: CampaignErrors = {};
    if (!testEmail.trim() || !testEmail.includes('@')) nextErrors.testEmail = 'Nhập email test hợp lệ.';
    if (!campaignForm.subject.trim()) nextErrors.subject = 'Nhập subject trước khi gửi test.';
    if (!campaignForm.body.trim()) nextErrors.body = 'Nhập nội dung email trước khi gửi test.';
    setCampaignErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/campaign/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail.trim(),
          campaignName: campaignForm.name.trim() || 'Untitled campaign',
          subject: campaignForm.subject.trim(),
          previewText: campaignForm.previewText.trim(),
          body: campaignForm.body.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Gửi test thất bại');
      }
      showToast(`Đã gửi email test tới ${testEmail.trim()}`);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Gửi test thất bại'), 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const deleteCampaignDraft = (id: string) => {
    persistCampaignDrafts(campaignDrafts.filter(draft => draft.id !== id));
    showToast('Đã xóa bản nháp campaign');
  };

  const openScheduleCampaign = (draft: CampaignDraft) => {
    const defaultDate = new Date(Date.now() + 10 * 60 * 1000);
    defaultDate.setSeconds(0, 0);
    const localValue = toDateTimeLocalValue(defaultDate);
    setScheduleTarget(draft);
    setScheduleDate(getLocalDatePart(localValue));
    setScheduleHour(localValue.slice(11, 13));
    setScheduleMinute(localValue.slice(14, 16));
    setScheduleError('');
  };

  const scheduleCampaign = async () => {
    if (!scheduleTarget) return;
    const normalizedHour = normalizeTimeInput(scheduleHour, 23);
    const normalizedMinute = normalizeTimeInput(scheduleMinute, 59);
    const localScheduledAt = buildLocalScheduleValue(scheduleDate, scheduleHour, scheduleMinute);
    if (!localScheduledAt) {
      setScheduleError('Chọn ngày giờ gửi campaign.');
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
      showToast('Đã lên lịch gửi campaign');
    } catch (error: unknown) {
      setScheduleError(getErrorMessage(error, 'Lên lịch gửi thất bại'));
    } finally {
      setIsScheduling(false);
    }
  };

  const setStatusFilter = (next: SubscriberStatus) => {
    setStatus(current => current === next && next !== 'all' ? 'all' : next);
    setPage(1);
  };

  const handleToggleActive = async (subscriber: Subscriber) => {
    setLoadingId(subscriber.id);
    try {
      const nextActive = !subscriber.isActive;
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/${subscriber.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái subscriber');
      setSubscribers(prev => prev.map(item => item.id === subscriber.id ? { ...item, isActive: nextActive } : item));
      await fetchStats();
      showToast(nextActive ? 'Đã bật nhận tin cho email này' : 'Đã tạm dừng nhận tin');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Cập nhật thất bại'), 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa subscriber');
      setDeleteTarget(null);
      showToast('Đã xóa subscriber');
      await fetchSubscribers();
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Xóa subscriber thất bại'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportCsv = async () => {
    try {
      const qs = new URLSearchParams();
      qs.set('page', '1');
      qs.set('limit', '1000');
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (status !== 'all') qs.set('status', status);
      const res = await fetchWithAuth(`${API_BASE_URL}/subscriber?${qs}`);
      if (!res.ok) throw new Error('Không thể xuất CSV');
      const json = await res.json();
      const rows: Subscriber[] = Array.isArray(json?.data) ? json.data : [];
      const csv = [
        ['ID', 'Email', 'Trạng thái', 'Ngày đăng ký'].map(escapeCsv).join(','),
        ...rows.map(item => [
          item.id,
          item.email,
          item.isActive ? 'Đang nhận tin' : 'Đã tạm dừng',
          formatDate(item.createdAt),
        ].map(escapeCsv).join(',')),
      ].join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `azure-horizon-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Xuất CSV thất bại'), 'error');
    }
  };

  const kpis = [
    { icon: 'groups', label: 'Tổng subscriber', value: stats.total, color: 'bg-blue-50 text-blue-700', filter: 'all' as SubscriberStatus },
    { icon: 'mark_email_read', label: 'Đang nhận tin', value: stats.active, color: 'bg-emerald-50 text-emerald-700', filter: 'active' as SubscriberStatus },
    { icon: 'unsubscribe', label: 'Đã tạm dừng', value: stats.inactive, color: 'bg-rose-50 text-rose-700', filter: 'inactive' as SubscriberStatus },
    { icon: 'trending_up', label: 'Mới tháng này', value: stats.thisMonth, color: 'bg-amber-50 text-amber-700', filter: 'all' as SubscriberStatus },
  ];

  return (
    <main className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-2">Email Marketing</p>
          <h1 className="font-headline text-3xl font-extrabold text-slate-950 tracking-tight">Marketing Center</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Quản lý danh sách khách đăng ký nhận ưu đãi và câu chuyện du lịch. Subscriber được tách khỏi ticket hỗ trợ để dữ liệu vận hành rõ ràng hơn.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportCsv}
            className="h-11 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Xuất CSV
          </button>
          <button
            onClick={openCreateCampaign}
            className="h-11 px-5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-lg shadow-blue-700/20"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Tạo campaign
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {kpis.map(kpi => {
          const active = status === kpi.filter || (kpi.filter === 'all' && status === 'all');
          return (
            <button
              key={kpi.label}
              onClick={() => setStatusFilter(kpi.filter)}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${kpi.color}`}>
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
                </div>
                {active && <span className="material-symbols-outlined text-blue-600 text-[18px]">filter_alt</span>}
              </div>
              <p className="text-3xl font-extrabold text-slate-950 mt-5 tabular-nums">{kpi.value.toLocaleString('vi-VN')}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{kpi.label}</p>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 mb-7">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-950">Bản nháp campaign</h2>
              <p className="text-xs text-slate-500 mt-0.5">Soạn trước nội dung, gửi test và lên lịch ở bước tiếp theo.</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">{campaignDrafts.length} draft</span>
          </div>
          <div className="p-4 space-y-3">
            {campaignDrafts.length === 0 ? (
              <button
                onClick={openCreateCampaign}
                className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
              >
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">campaign</span>
                <p className="text-sm font-bold text-slate-800">Chưa có campaign draft</p>
                <p className="text-xs text-slate-500 mt-1">Bấm để tạo bản nháp email đầu tiên.</p>
              </button>
            ) : (
              campaignDrafts.slice(0, 4).map(draft => {
                const cfg = campaignTypeConfig[draft.type];
                const statusCfg = campaignStatusConfig[draft.status];
                return (
                  <div key={draft.id} className="rounded-2xl border border-slate-100 bg-white p-4 hover:border-blue-100 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.tone}`}>
                            <span className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                            {cfg.label}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusCfg.tone}`}>{statusCfg.label}</span>
                        </div>
                        <h3 className="font-extrabold text-slate-950 truncate">{draft.name}</h3>
                        <p className="text-sm text-slate-500 truncate mt-1">{draft.subject}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {draft.recipientEstimate.toLocaleString('vi-VN')} người nhận dự kiến · {draft.scheduledAt ? `gửi lúc ${formatDate(draft.scheduledAt)}` : `cập nhật ${formatDate(draft.updatedAt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {draft.status === 'DRAFT' && (
                          <button
                            onClick={() => openScheduleCampaign(draft)}
                            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                            title="Lên lịch gửi"
                          >
                            <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditCampaign(draft)}
                          disabled={draft.status !== 'DRAFT'}
                          className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                          title="Mở draft"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => deleteCampaignDraft(draft.id)}
                          className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
                          title="Xóa draft"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 text-slate-900 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-blue-50/60">
            <h2 className="text-base font-extrabold text-slate-950">Quy trình gửi chuẩn</h2>
            <p className="text-xs text-slate-500 mt-1">Không gửi hàng loạt nếu chưa qua bước kiểm tra nội dung.</p>
          </div>
          <div className="p-5 space-y-4">
            {[
              ['edit_note', 'Tạo bản nháp', 'Soạn subject, preview text và nội dung chính.'],
              ['visibility', 'Xem trước', 'Kiểm tra cách email hiển thị với khách hàng.'],
              ['outgoing_mail', 'Gửi test', 'Gửi thử tới email nội bộ trước khi gửi thật.'],
              ['schedule_send', 'Lên lịch gửi', 'Chỉ gửi cho subscriber đang nhận tin.'],
            ].map(([icon, title, desc], index) => (
              <div key={title} className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                  <span className="material-symbols-outlined text-[19px]">{icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{index + 1}. {title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm email subscriber..."
              className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 pl-12 pr-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value as SubscriberStatus); setPage(1); }}
            className="h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          >
            {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 flex items-center text-sm font-semibold text-slate-500 whitespace-nowrap">
            {filteredSummary}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-bold">Subscriber</th>
                <th className="px-5 py-4 font-bold">Trạng thái</th>
                <th className="px-5 py-4 font-bold">Nguồn</th>
                <th className="px-5 py-4 font-bold">Ngày đăng ký</th>
                <th className="px-5 py-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-56" /></td>
                  <td className="px-5 py-4"><div className="h-7 bg-slate-100 rounded-full w-28" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                  <td className="px-5 py-4"><div className="h-8 bg-slate-100 rounded ml-auto w-24" /></td>
                </tr>
              ))}
              {!isLoading && subscribers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">mark_email_unread</span>
                    <p className="font-bold text-slate-800">Chưa có subscriber phù hợp</p>
                    <p className="text-sm text-slate-500 mt-1">Thử bỏ bộ lọc hoặc kiểm tra lại từ khóa tìm kiếm.</p>
                  </td>
                </tr>
              )}
              {!isLoading && subscribers.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{item.email}</p>
                        <p className="text-xs text-slate-400">ID #{item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {item.isActive ? 'Đang nhận tin' : 'Đã tạm dừng'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">public</span>
                      Website
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 tabular-nums">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(item)}
                        disabled={loadingId === item.id}
                        className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors disabled:opacity-60"
                        title={item.isActive ? 'Tạm dừng nhận tin' : 'Bật nhận tin'}
                      >
                        <span className="material-symbols-outlined text-[18px]">{item.isActive ? 'notifications_off' : 'notifications_active'}</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
                        title="Xóa subscriber"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100">
          <AdminPagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={limit}
            onPageChange={setPage}
            onPageSizeChange={(next) => { setLimit(next); setPage(1); }}
            itemLabel="subscriber"
          />
        </div>
      </section>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/55" onClick={() => setComposerOpen(false)} aria-label="Đóng composer" />
          <div className="relative w-full max-w-6xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-1">Campaign composer</p>
                <h2 className="text-2xl font-extrabold text-slate-950">{editingCampaignId ? 'Chỉnh sửa campaign draft' : 'Tạo campaign draft'}</h2>
              </div>
              <button
                onClick={() => setComposerOpen(false)}
                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tên campaign</span>
                    <input
                      value={campaignForm.name}
                      onChange={e => {
                        setCampaignForm(form => ({ ...form, name: e.target.value }));
                        setCampaignErrors(errors => ({ ...errors, name: undefined }));
                      }}
                      placeholder="VD: Flash sale hè 2026"
                      aria-invalid={Boolean(campaignErrors.name)}
                      className={`w-full h-12 rounded-xl bg-slate-50 border px-4 text-sm outline-none focus:ring-2 ${campaignErrors.name ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-300'}`}
                    />
                    {campaignErrors.name && <p className="text-xs font-semibold text-rose-600">{campaignErrors.name}</p>}
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Loại campaign</span>
                    <select
                      value={campaignForm.type}
                      onChange={e => setCampaignForm(form => ({ ...form, type: e.target.value as CampaignType }))}
                      className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    >
                      {Object.entries(campaignTypeConfig).map(([value, cfg]) => (
                        <option key={value} value={value}>{cfg.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject email</span>
                  <input
                    value={campaignForm.subject}
                    onChange={e => {
                      setCampaignForm(form => ({ ...form, subject: e.target.value }));
                      setCampaignErrors(errors => ({ ...errors, subject: undefined }));
                    }}
                    placeholder="VD: Ưu đãi độc quyền cho chuyến đi mùa hè của bạn"
                    aria-invalid={Boolean(campaignErrors.subject)}
                    className={`w-full h-12 rounded-xl bg-slate-50 border px-4 text-sm outline-none focus:ring-2 ${campaignErrors.subject ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-300'}`}
                  />
                  {campaignErrors.subject && <p className="text-xs font-semibold text-rose-600">{campaignErrors.subject}</p>}
                </label>

                <label className="space-y-2 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview text</span>
                  <input
                    value={campaignForm.previewText}
                    onChange={e => setCampaignForm(form => ({ ...form, previewText: e.target.value }))}
                    placeholder="Một dòng ngắn hiển thị sau subject trong inbox"
                    className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['ALL_ACTIVE', 'Tất cả subscriber đang nhận tin', `${stats.active.toLocaleString('vi-VN')} người nhận dự kiến`],
                    ['CURRENT_FILTER', 'Theo bộ lọc hiện tại', `${recipientEstimate.toLocaleString('vi-VN')} người nhận dự kiến`],
                  ].map(([value, title, desc]) => {
                    const active = campaignForm.audience === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setCampaignForm(form => ({ ...form, audience: value as AudienceType }))}
                        className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[19px] ${active ? 'text-blue-700' : 'text-slate-400'}`}>
                            {active ? 'radio_button_checked' : 'radio_button_unchecked'}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900">{title}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 pl-7">{desc}</p>
                      </button>
                    );
                  })}
                </div>

                <label className="space-y-2 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung email</span>
                  <textarea
                    value={campaignForm.body}
                    onChange={e => {
                      setCampaignForm(form => ({ ...form, body: e.target.value }));
                      setCampaignErrors(errors => ({ ...errors, body: undefined }));
                    }}
                    placeholder="Viết nội dung chính gửi cho khách hàng. Ví dụ: giới thiệu ưu đãi, tour nổi bật, điều kiện áp dụng và lời kêu gọi hành động."
                    rows={10}
                    aria-invalid={Boolean(campaignErrors.body)}
                    className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none focus:ring-2 resize-none ${campaignErrors.body ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-300'}`}
                  />
                  {campaignErrors.body && <p className="text-xs font-semibold text-rose-600">{campaignErrors.body}</p>}
                </label>
              </div>

              <aside className="bg-slate-50 border-l border-slate-100 p-6">
                <div className="sticky top-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950">Preview inbox</h3>
                    <p className="text-xs text-slate-500 mt-1">Mô phỏng cách campaign xuất hiện trước khi gửi.</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-700 text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">travel_explore</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-950">Azure Horizon</p>
                        <p className="text-xs text-slate-400 truncate">newsletter@azurehorizon.vn</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${campaignTypeConfig[campaignForm.type].tone}`}>
                        <span className="material-symbols-outlined text-[15px]">{campaignTypeConfig[campaignForm.type].icon}</span>
                        {campaignTypeConfig[campaignForm.type].label}
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-950 mt-4 leading-snug">
                        {campaignForm.subject || 'Subject email của bạn'}
                      </h4>
                      <p className="text-sm text-slate-500 mt-2">
                        {campaignForm.previewText || 'Preview text sẽ hiển thị ở đây.'}
                      </p>
                      <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4 min-h-36">
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-6">
                          {campaignForm.body || 'Nội dung email sẽ được preview tại đây khi bạn bắt đầu soạn.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-600">Người nhận dự kiến</span>
                      <span className="font-extrabold text-blue-700 tabular-nums">{recipientEstimate.toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Chỉ tính subscriber đang bật nhận tin. Nhóm tạm dừng sẽ không được gửi.</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Gửi test nội bộ</span>
                      <input
                        value={testEmail}
                        onChange={e => {
                          setTestEmail(e.target.value);
                          setCampaignErrors(errors => ({ ...errors, testEmail: undefined }));
                        }}
                        type="email"
                        placeholder="admin@azurehorizon.vn"
                        aria-invalid={Boolean(campaignErrors.testEmail)}
                        className={`w-full h-11 rounded-xl bg-slate-50 border px-3 text-sm outline-none focus:ring-2 ${campaignErrors.testEmail ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-300'}`}
                      />
                      {campaignErrors.testEmail && <p className="text-xs font-semibold text-rose-600">{campaignErrors.testEmail}</p>}
                    </label>
                    <button
                      onClick={sendTestCampaign}
                      disabled={isSendingTest}
                      className="mt-3 w-full h-10 rounded-xl bg-slate-950 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isSendingTest ? 'animate-spin' : ''}`}>
                        {isSendingTest ? 'progress_activity' : 'outgoing_mail'}
                      </span>
                      {isSendingTest ? 'Đang gửi test...' : 'Gửi test'}
                    </button>
                    <p className="text-xs text-slate-400 mt-2">Email test có tiền tố [TEST] và không gửi tới subscriber.</p>
                  </div>
                </div>
              </aside>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <p className="text-xs text-slate-500">
                Bước này chỉ lưu draft. Gửi test và gửi thật sẽ được khóa ở bước riêng để tránh gửi nhầm.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setComposerOpen(false)}
                  className="h-10 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={saveCampaignDraft}
                  className="h-10 px-5 rounded-xl text-sm font-bold bg-blue-700 text-white hover:bg-blue-800"
                >
                  Lưu bản nháp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/55" onClick={() => setScheduleTarget(null)} aria-label="Đóng lịch gửi" />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">event_upcoming</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 mb-1">Schedule campaign</p>
              <h2 className="text-2xl font-extrabold text-slate-950">Lên lịch gửi</h2>
              <p className="text-sm text-slate-500 mt-2">
                Campaign <strong className="text-slate-900">{scheduleTarget.name}</strong> sẽ được cron backend kiểm tra mỗi phút và gửi khi đến hạn.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">Người nhận dự kiến</span>
                  <span className="font-extrabold text-blue-700 tabular-nums">{scheduleTarget.recipientEstimate.toLocaleString('vi-VN')}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Chỉ gửi cho subscriber đang nhận tin. Email tạm dừng sẽ tự bị loại.</p>
              </div>
              <div className="space-y-3">
                <div className={`rounded-2xl border bg-slate-50 p-3 ${scheduleError ? 'border-rose-300' : 'border-slate-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_188px] gap-3">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ngày</span>
                      <input
                        type="date"
                        value={scheduleDate}
                        min={getLocalDatePart(toDateTimeLocalValue(new Date()))}
                        onChange={e => {
                          const next = e.target.value;
                          setScheduleDate(next);
                          setScheduleError('');
                        }}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Thời gian</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">24h</span>
                      </div>
                      <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center rounded-xl border border-slate-200 bg-white px-2 transition focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
                        <input
                          aria-label="Giờ"
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={scheduleHour}
                          onFocus={e => e.currentTarget.select()}
                          onChange={e => {
                            setScheduleHour(sanitizeTimeInput(e.target.value, 23));
                            setScheduleError('');
                          }}
                          onBlur={e => setScheduleHour(normalizeTimeInput(e.target.value, 23))}
                          placeholder="HH"
                          className="min-w-0 bg-transparent text-center text-base font-extrabold tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
                        />
                        <span className="px-1 text-base font-extrabold text-slate-300">:</span>
                        <input
                          aria-label="Phút"
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={scheduleMinute}
                          onFocus={e => e.currentTarget.select()}
                          onChange={e => {
                            setScheduleMinute(sanitizeTimeInput(e.target.value, 59));
                            setScheduleError('');
                          }}
                          onBlur={e => setScheduleMinute(normalizeTimeInput(e.target.value, 59))}
                          placeholder="MM"
                          className="min-w-0 bg-transparent text-center text-base font-extrabold tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 px-1 text-[10px] font-semibold text-slate-400">
                        <span>Giờ 00-23</span>
                        <span className="text-right">Phút 00-59</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-white border border-slate-200 px-3 py-2 flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">schedule</span>
                    <span>
                      Sẽ gửi lúc <strong className="text-slate-800">{schedulePreviewAt ? formatDate(schedulePreviewAt) : 'chưa chọn'}</strong>
                    </span>
                  </div>
                </div>
                {scheduleError && <p className="text-xs font-semibold text-rose-600">{scheduleError}</p>}
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => setScheduleTarget(null)}
                className="h-10 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={scheduleCampaign}
                disabled={isScheduling}
                className="h-10 px-5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
              >
                <span className={`material-symbols-outlined text-[18px] ${isScheduling ? 'animate-spin' : ''}`}>
                  {isScheduling ? 'progress_activity' : 'schedule_send'}
                </span>
                {isScheduling ? 'Đang lên lịch...' : 'Lên lịch gửi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setDeleteTarget(null)} aria-label="Đóng" />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">delete</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-950">Xóa subscriber?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Email <strong className="text-slate-900">{deleteTarget.email}</strong> sẽ bị xóa khỏi danh sách nhận tin.
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="h-10 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="h-10 px-4 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" className="sr-only">{toast?.message}</div>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-5 py-4 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.message}
        </div>
      )}
    </main>
  );
}
