'use client';

import { campaignFilters, campaignStatusConfig, campaignTypeConfig } from '../_lib/config';
import type { CampaignFilterKey } from '../_lib/config';
import { formatDate } from '../_lib/helpers';
import type { CampaignCounts, CampaignDraft, Meta } from '../_lib/types';

const PROCESS_STEPS = [
  ['edit_note', 'Tạo bản nháp', 'Soạn tiêu đề, dòng xem trước và nội dung chính.'],
  ['visibility', 'Xem trước', 'Kiểm tra cách email hiển thị với khách hàng.'],
  ['outgoing_mail', 'Gửi thử', 'Gửi thử tới email nội bộ trước khi gửi thật.'],
  ['schedule_send', 'Lên lịch gửi', 'Chỉ gửi cho người đăng ký đang nhận tin.'],
] as const;

interface MarketingCampaignOverviewProps {
  drafts: CampaignDraft[];
  filter: CampaignFilterKey;
  counts: CampaignCounts;
  meta: Meta;
  page: number;
  onFilterChange: (key: CampaignFilterKey) => void;
  onPageChange: (page: number) => void;
  onCreateCampaign: () => void;
  onEditCampaign: (draft: CampaignDraft) => void;
  onScheduleCampaign: (draft: CampaignDraft) => void;
  onDeleteDraft: (id: string) => void;
  onCancelCampaign: (campaign: CampaignDraft) => void;
}

export function MarketingCampaignOverview({
  drafts,
  filter,
  counts,
  meta,
  page,
  onFilterChange,
  onPageChange,
  onCreateCampaign,
  onEditCampaign,
  onScheduleCampaign,
  onDeleteDraft,
  onCancelCampaign,
}: MarketingCampaignOverviewProps) {
  const noCampaignsAtAll = counts.all === 0;

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 mb-7">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">Chiến dịch gần đây</h2>
            <p className="text-xs text-slate-500 mt-0.5">Bản nháp và trạng thái gửi được đồng bộ từ hệ thống.</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">{counts.all} chiến dịch</span>
        </div>
        {!noCampaignsAtAll && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {campaignFilters.map(({ key, label }) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onFilterChange(key)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-200 hover:text-blue-700'
                  }`}
                >
                  {label}
                  <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/25 text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {noCampaignsAtAll ? (
          <div className="p-4">
            <button
              onClick={onCreateCampaign}
              className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
            >
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">campaign</span>
              <p className="text-sm font-bold text-slate-800">Chưa có chiến dịch</p>
              <p className="text-xs text-slate-500 mt-1">Bấm để tạo bản nháp email đầu tiên.</p>
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-4">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">inbox</span>
              <p className="text-sm font-bold text-slate-700">Không có chiến dịch trong nhóm này</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 px-2">
            {drafts.map(draft => (
              <CampaignRow
                key={draft.id}
                campaign={draft}
                onEdit={onEditCampaign}
                onSchedule={onScheduleCampaign}
                onDeleteDraft={onDeleteDraft}
                onCancelCampaign={onCancelCampaign}
              />
            ))}
          </ul>
        )}

        {!noCampaignsAtAll && meta.totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
              Trước
            </button>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              Trang {page}/{meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= meta.totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 text-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-blue-50/60">
          <h2 className="text-base font-extrabold text-slate-950">Quy trình gửi chuẩn</h2>
          <p className="text-xs text-slate-500 mt-1">Không gửi hàng loạt nếu chưa qua bước kiểm tra nội dung.</p>
        </div>
        <div className="p-5 space-y-4">
          {PROCESS_STEPS.map(([icon, title, desc], index) => (
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
  );
}

interface CampaignRowProps {
  campaign: CampaignDraft;
  onEdit: (campaign: CampaignDraft) => void;
  onSchedule: (campaign: CampaignDraft) => void;
  onDeleteDraft: (id: string) => void;
  onCancelCampaign: (campaign: CampaignDraft) => void;
}

function CampaignRow({
  campaign,
  onEdit,
  onSchedule,
  onDeleteDraft,
  onCancelCampaign,
}: CampaignRowProps) {
  const typeConfig = campaignTypeConfig[campaign.type];
  const statusConfig = campaignStatusConfig[campaign.status];

  return (
    <li className="flex items-center gap-3 px-2 py-3 hover:bg-slate-50/70 transition-colors">
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${typeConfig.tone}`}
        title={typeConfig.label}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{typeConfig.icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-bold text-slate-900">{campaign.name}</h3>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusConfig.tone}`}>{statusConfig.label}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">{campaignSummaryLine(campaign)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {campaign.status === 'DRAFT' && (
          <>
            <ActionButton icon="event_upcoming" label="Lên lịch gửi" tone="emerald" onClick={() => onSchedule(campaign)} />
            <ActionButton icon="edit" label="Mở bản nháp" tone="blue" onClick={() => onEdit(campaign)} />
            <ActionButton icon="delete" label="Xóa bản nháp" tone="rose" onClick={() => onDeleteDraft(campaign.id)} />
          </>
        )}
        {campaign.status === 'SCHEDULED' && (
          <ActionButton icon="event_busy" label="Hủy lịch gửi" tone="amber" onClick={() => onCancelCampaign(campaign)} />
        )}
      </div>
    </li>
  );
}

function campaignSummaryLine(campaign: CampaignDraft): string {
  const recipients = campaign.recipientEstimate.toLocaleString('vi-VN');
  switch (campaign.status) {
    case 'SENDING': {
      const processed = (campaign.processedCount ?? 0).toLocaleString('vi-VN');
      const progress = campaign.recipientEstimate > 0
        ? Math.min(100, Math.round(((campaign.processedCount ?? 0) / campaign.recipientEstimate) * 100))
        : 0;
      return `Đang gửi ${processed}/${recipients} · ${progress}%`;
    }
    case 'SENT':
      return `${(campaign.sentCount ?? 0).toLocaleString('vi-VN')} đã gửi · ${(campaign.failedCount ?? 0).toLocaleString('vi-VN')} lỗi · ${formatDate(campaign.sentAt ?? campaign.updatedAt)}`;
    case 'FAILED':
      return campaign.errorMessage ? `Lỗi: ${campaign.errorMessage}` : `Gửi lỗi · ${formatDate(campaign.sentAt ?? campaign.updatedAt)}`;
    case 'CANCELLED':
      return `Đã hủy lúc ${formatDate(campaign.cancelledAt ?? campaign.updatedAt)}`;
    case 'SCHEDULED':
      return `${recipients} người nhận · gửi lúc ${formatDate(campaign.scheduledAt ?? campaign.updatedAt)}`;
    default:
      return `${recipients} người nhận · cập nhật ${formatDate(campaign.updatedAt)}`;
  }
}

const ACTION_TONES = {
  blue: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700',
  emerald: 'hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700',
  amber: 'hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700',
  rose: 'hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700',
} as const;

function ActionButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: string;
  label: string;
  tone: keyof typeof ACTION_TONES;
  onClick: () => void;
}) {
  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        aria-label={label}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors ${ACTION_TONES[tone]}`}
      >
        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{icon}</span>
      </button>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
      </span>
    </div>
  );
}
