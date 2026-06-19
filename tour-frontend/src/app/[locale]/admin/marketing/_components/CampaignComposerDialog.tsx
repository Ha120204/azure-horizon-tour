'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { UnsavedChangesDialog } from '@/components/admin/UnsavedChangesDialog';
import { campaignTypeConfig } from '../_lib/config';
import type {
  AudienceType,
  CampaignErrors,
  CampaignForm,
  CampaignType,
  Subscriber,
  SubscriberStats,
  SubscriberStatus,
} from '../_lib/types';

interface CampaignComposerDialogProps {
  isEditing: boolean;
  campaignForm: CampaignForm;
  setCampaignForm: Dispatch<SetStateAction<CampaignForm>>;
  campaignErrors: CampaignErrors;
  setCampaignErrors: Dispatch<SetStateAction<CampaignErrors>>;
  stats: SubscriberStats;
  recipientEstimate: number;
  currentFilterSummary: string;
  currentSearch: string;
  currentStatus: SubscriberStatus;
  testEmail: string;
  setTestEmail: Dispatch<SetStateAction<string>>;
  isSendingTest: boolean;
  onClose: () => void;
  onSendTest: () => void;
  onSave: () => void;
}

export function CampaignComposerDialog({
  isEditing,
  campaignForm,
  setCampaignForm,
  campaignErrors,
  setCampaignErrors,
  stats,
  recipientEstimate,
  currentFilterSummary,
  currentSearch,
  currentStatus,
  testEmail,
  setTestEmail,
  isSendingTest,
  onClose,
  onSendTest,
  onSave,
}: CampaignComposerDialogProps) {
  const typeConfig = campaignTypeConfig[campaignForm.type];
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientCandidates, setRecipientCandidates] = useState<Subscriber[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const initialFormRef = useRef({ name: campaignForm.name, subject: campaignForm.subject, body: campaignForm.body });
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const isDirty =
    campaignForm.name !== initialFormRef.current.name ||
    campaignForm.subject !== initialFormRef.current.subject ||
    campaignForm.body !== initialFormRef.current.body;

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  };
  const selectedRecipientIds = campaignForm.selectedSubscriberIds;
  const selectedRecipientEmails = campaignForm.selectedSubscriberEmails;
  const selectedRecipientSet = useMemo(() => new Set(selectedRecipientIds), [selectedRecipientIds]);
  const selectedRecipients = useMemo(() => selectedRecipientIds.map((id, index) => ({
    id,
    email: selectedRecipientEmails[index] ?? `Người đăng ký #${id}`,
  })), [selectedRecipientEmails, selectedRecipientIds]);

  const filterCaption = currentStatus === 'inactive'
    ? 'Bộ lọc hiện tại là tạm dừng nên sẽ không có người nhận.'
    : currentSearch.trim()
      ? `Đang lọc theo từ khóa "${currentSearch.trim()}".`
      : currentFilterSummary;

  const audienceOptions: { value: AudienceType; title: string; desc: string; icon: string }[] = [
    {
      value: 'ALL_ACTIVE',
      title: 'Tất cả đang nhận tin',
      desc: `${stats.active.toLocaleString('vi-VN')} người đăng ký đang bật`,
      icon: 'groups',
    },
    {
      value: 'CURRENT_FILTER',
      title: 'Theo bộ lọc hiện tại',
      desc: filterCaption,
      icon: 'filter_alt',
    },
    {
      value: 'MANUAL_SELECTION',
      title: 'Chọn thủ công',
      desc: `${selectedRecipientIds.length.toLocaleString('vi-VN')} người đã chọn`,
      icon: 'checklist',
    },
  ];

  useEffect(() => {
    if (campaignForm.audience !== 'MANUAL_SELECTION') return;

    const timer = window.setTimeout(async () => {
      setIsLoadingRecipients(true);
      try {
        const qs = new URLSearchParams({
          page: '1',
          limit: '8',
          status: 'active',
        });
        if (recipientQuery.trim()) qs.set('search', recipientQuery.trim());
        const res = await fetchWithAuth(`${API_BASE_URL}/subscriber?${qs}`);
        const json = await res.json();
        setRecipientCandidates(res.ok && Array.isArray(json?.data) ? json.data : []);
      } catch {
        setRecipientCandidates([]);
      } finally {
        setIsLoadingRecipients(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [campaignForm.audience, recipientQuery]);

  const changeAudience = (audience: AudienceType) => {
    setCampaignForm(form => ({ ...form, audience }));
    setCampaignErrors(errors => ({ ...errors, audience: undefined }));
  };

  const toggleRecipient = (subscriber: Pick<Subscriber, 'id' | 'email' | 'isActive'>) => {
    if (!subscriber.isActive) return;
    setCampaignForm(form => {
      const exists = form.selectedSubscriberIds.includes(subscriber.id);
      if (exists) {
        return {
          ...form,
          selectedSubscriberIds: form.selectedSubscriberIds.filter(id => id !== subscriber.id),
          selectedSubscriberEmails: form.selectedSubscriberEmails.filter((_, index) => form.selectedSubscriberIds[index] !== subscriber.id),
        };
      }
      return {
        ...form,
        selectedSubscriberIds: [...form.selectedSubscriberIds, subscriber.id],
        selectedSubscriberEmails: [...form.selectedSubscriberEmails, subscriber.email],
      };
    });
    setCampaignErrors(errors => ({ ...errors, audience: undefined }));
  };

  const selectVisibleRecipients = () => {
    setCampaignForm(form => {
      const nextIds = [...form.selectedSubscriberIds];
      const nextEmails = [...form.selectedSubscriberEmails];
      recipientCandidates.forEach(subscriber => {
        if (!subscriber.isActive || nextIds.includes(subscriber.id)) return;
        nextIds.push(subscriber.id);
        nextEmails.push(subscriber.email);
      });
      return { ...form, selectedSubscriberIds: nextIds, selectedSubscriberEmails: nextEmails };
    });
    setCampaignErrors(errors => ({ ...errors, audience: undefined }));
  };

  const clearManualRecipients = () => {
    setCampaignForm(form => ({ ...form, selectedSubscriberIds: [], selectedSubscriberEmails: [] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/55" onClick={handleClose} aria-label="Đóng trình soạn" />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Soạn chiến dịch</p>
            <h2 className="text-2xl font-extrabold text-slate-950">{isEditing ? 'Chỉnh sửa bản nháp chiến dịch' : 'Tạo bản nháp chiến dịch'}</h2>
          </div>
          <button
            onClick={handleClose}
            className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_420px]">
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tên chiến dịch</span>
                <input
                  value={campaignForm.name}
                  onChange={e => {
                    setCampaignForm(form => ({ ...form, name: e.target.value }));
                    setCampaignErrors(errors => ({ ...errors, name: undefined }));
                  }}
                  placeholder="VD: Ưu đãi hè 2026"
                  aria-invalid={Boolean(campaignErrors.name)}
                  className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm outline-none focus:ring-2 ${campaignErrors.name ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'}`}
                />
                {campaignErrors.name && <p className="text-xs font-semibold text-rose-600">{campaignErrors.name}</p>}
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Loại chiến dịch</span>
                <select
                  value={campaignForm.type}
                  onChange={e => setCampaignForm(form => ({ ...form, type: e.target.value as CampaignType }))}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                >
                  {Object.entries(campaignTypeConfig).map(([value, cfg]) => (
                    <option key={value} value={value}>{cfg.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tiêu đề email</span>
              <input
                value={campaignForm.subject}
                onChange={e => {
                  setCampaignForm(form => ({ ...form, subject: e.target.value }));
                  setCampaignErrors(errors => ({ ...errors, subject: undefined }));
                }}
                placeholder="VD: Ưu đãi độc quyền cho chuyến đi mùa hè của bạn"
                aria-invalid={Boolean(campaignErrors.subject)}
                className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm outline-none focus:ring-2 ${campaignErrors.subject ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'}`}
              />
              {campaignErrors.subject && <p className="text-xs font-semibold text-rose-600">{campaignErrors.subject}</p>}
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Dòng xem trước</span>
              <input
                value={campaignForm.previewText}
                onChange={e => setCampaignForm(form => ({ ...form, previewText: e.target.value }))}
                placeholder="Một dòng ngắn hiển thị sau tiêu đề trong hộp thư"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Người nhận chiến dịch</span>
                  <p className="mt-1 text-xs text-slate-500">Chọn rõ nhóm nhận tin trước khi lưu để lúc lên lịch không gửi nhầm.</p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-extrabold text-white tabular-nums">
                  {recipientEstimate.toLocaleString('vi-VN')} dự kiến
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {audienceOptions.map(({ value, title, desc, icon }) => {
                  const active = campaignForm.audience === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeAudience(value)}
                      className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[19px]">{icon}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold text-slate-900">{title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {campaignForm.audience === 'MANUAL_SELECTION' && (
                <div className={`rounded-2xl border bg-slate-50 p-4 ${campaignErrors.audience ? 'border-rose-300' : 'border-slate-200'}`}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="relative flex-1">
                          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                          <input
                            value={recipientQuery}
                            onChange={event => setRecipientQuery(event.target.value)}
                            placeholder="Tìm email đang nhận tin..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={selectVisibleRecipients}
                          disabled={recipientCandidates.length === 0 || recipientCandidates.every(subscriber => selectedRecipientSet.has(subscriber.id))}
                          className="h-11 rounded-xl border border-blue-200 bg-white px-3 text-xs font-extrabold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Chọn kết quả
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                        {isLoadingRecipients ? (
                          <div className="p-4 text-sm font-semibold text-slate-500">Đang tải người đăng ký...</div>
                        ) : recipientCandidates.length === 0 ? (
                          <div className="p-5 text-center">
                            <span className="material-symbols-outlined text-3xl text-slate-300">person_search</span>
                            <p className="mt-1 text-sm font-bold text-slate-800">Không tìm thấy email đang nhận tin</p>
                          </div>
                        ) : (
                          recipientCandidates.map(subscriber => {
                            const checked = selectedRecipientSet.has(subscriber.id);
                            return (
                              <button
                                key={subscriber.id}
                                type="button"
                                onClick={() => toggleRecipient(subscriber)}
                                className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-slate-50 ${checked ? 'bg-blue-50/70' : ''}`}
                              >
                                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${checked ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  <span className="material-symbols-outlined text-[18px]">{checked ? 'check' : 'alternate_email'}</span>
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold text-slate-900">{subscriber.email}</span>
                                  <span className="text-xs text-slate-400">ID #{subscriber.id}</span>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Đã chọn</p>
                        <button type="button" onClick={clearManualRecipients} className="text-xs font-bold text-slate-400 hover:text-rose-600">
                          Bỏ chọn
                        </button>
                      </div>
                      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                        {selectedRecipients.length === 0 ? (
                          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-500">
                            Chưa chọn người đăng ký nào.
                          </p>
                        ) : (
                          selectedRecipients.map(recipient => (
                            <div key={recipient.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{recipient.email}</span>
                              <button
                                type="button"
                                onClick={() => toggleRecipient({ id: recipient.id, email: recipient.email, isActive: true })}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Bỏ chọn ${recipient.email}`}
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {campaignErrors.audience && <p className="mt-3 text-xs font-semibold text-rose-600">{campaignErrors.audience}</p>}
                </div>
              )}
            </section>

            <label className="block space-y-2">
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
                className={`w-full resize-none rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ${campaignErrors.body ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'}`}
              />
              {campaignErrors.body && <p className="text-xs font-semibold text-rose-600">{campaignErrors.body}</p>}
            </label>
          </div>

          <aside className="border-l border-slate-100 bg-slate-50 p-6">
            <div className="sticky top-6 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-950">Xem trước hộp thư</h3>
                <p className="mt-1 text-xs text-slate-500">Mô phỏng cách chiến dịch xuất hiện trước khi gửi.</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <span className="material-symbols-outlined text-[20px]">travel_explore</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950">Azure Horizon</p>
                    <p className="truncate text-xs text-slate-400">newsletter@azurehorizon.vn</p>
                  </div>
                </div>
                <div className="p-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${typeConfig.tone}`}>
                    <span className="material-symbols-outlined text-[15px]">{typeConfig.icon}</span>
                    {typeConfig.label}
                  </span>
                  <h4 className="mt-4 text-lg font-extrabold leading-snug text-slate-950">
                    {campaignForm.subject || 'Tiêu đề email của bạn'}
                  </h4>
                  <p className="mt-2 text-sm text-slate-500">
                    {campaignForm.previewText || 'Dòng xem trước sẽ hiển thị ở đây.'}
                  </p>
                  <div className="mt-5 min-h-36 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                      {campaignForm.body || 'Nội dung email sẽ được xem trước tại đây khi bạn bắt đầu soạn.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">Người nhận dự kiến</span>
                  <span className="font-extrabold tabular-nums text-blue-700">{recipientEstimate.toLocaleString('vi-VN')}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">Chỉ gửi cho người đăng ký đang bật nhận tin. Nhóm tạm dừng sẽ không được gửi.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Gửi thử nội bộ</span>
                  <input
                    value={testEmail}
                    onChange={e => {
                      setTestEmail(e.target.value);
                      setCampaignErrors(errors => ({ ...errors, testEmail: undefined }));
                    }}
                    type="email"
                    placeholder="admin@azurehorizon.vn"
                    aria-invalid={Boolean(campaignErrors.testEmail)}
                    className={`h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none focus:ring-2 ${campaignErrors.testEmail ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'}`}
                  />
                  {campaignErrors.testEmail && <p className="text-xs font-semibold text-rose-600">{campaignErrors.testEmail}</p>}
                </label>
                <button
                  onClick={onSendTest}
                  disabled={isSendingTest}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isSendingTest ? 'animate-spin' : ''}`}>
                    {isSendingTest ? 'progress_activity' : 'outgoing_mail'}
                  </span>
                  {isSendingTest ? 'Đang gửi thử...' : 'Gửi thử'}
                </button>
                <p className="mt-2 text-xs text-slate-400">Email gửi thử có tiền tố [GỬI THỬ] và không gửi tới người đăng ký.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            Bước này chỉ lưu bản nháp. Gửi thử và gửi thật sẽ được khóa ở bước riêng để tránh gửi nhầm.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="h-10 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
            >
              Lưu bản nháp
            </button>
          </div>
        </div>
      </div>

      {showConfirmClose && (
        <UnsavedChangesDialog
          onContinue={() => setShowConfirmClose(false)}
          onLeave={() => {
            setShowConfirmClose(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
