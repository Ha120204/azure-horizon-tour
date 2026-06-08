'use client';

import { useState } from 'react';
import { campaignStatusConfig, campaignTypeConfig } from '../_lib/config';
import { formatDate } from '../_lib/helpers';
import type { CampaignDraft } from '../_lib/types';

const PROCESS_STEPS = [
  ['edit_note', 'Tạo bản nháp', 'Soạn tiêu đề, dòng xem trước và nội dung chính.'],
  ['visibility', 'Xem trước', 'Kiểm tra cách email hiển thị với khách hàng.'],
  ['outgoing_mail', 'Gửi thử', 'Gửi thử tới email nội bộ trước khi gửi thật.'],
  ['schedule_send', 'Lên lịch gửi', 'Chỉ gửi cho người đăng ký đang nhận tin.'],
] as const;

interface MarketingCampaignOverviewProps {
  drafts: CampaignDraft[];
  onCreateCampaign: () => void;
  onEditCampaign: (draft: CampaignDraft) => void;
  onScheduleCampaign: (draft: CampaignDraft) => void;
  onDeleteDraft: (id: string) => void;
  onCancelCampaign: (campaign: CampaignDraft) => void;
}

export function MarketingCampaignOverview({
  drafts,
  onCreateCampaign,
  onEditCampaign,
  onScheduleCampaign,
  onDeleteDraft,
  onCancelCampaign,
}: MarketingCampaignOverviewProps) {
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const visibleCampaigns = showAllCampaigns ? drafts : drafts.slice(0, 4);
  const hasHiddenCampaigns = drafts.length > 4;

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 mb-7">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">Chiến dịch gần đây</h2>
            <p className="text-xs text-slate-500 mt-0.5">Bản nháp được lưu trên máy này; trạng thái gửi được đồng bộ từ hệ thống.</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">{drafts.length} chiến dịch</span>
        </div>
        <div className="p-4 space-y-3">
          {drafts.length === 0 ? (
            <button
              onClick={onCreateCampaign}
              className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
            >
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">campaign</span>
              <p className="text-sm font-bold text-slate-800">Chưa có chiến dịch</p>
              <p className="text-xs text-slate-500 mt-1">Bấm để tạo bản nháp email đầu tiên.</p>
            </button>
          ) : (
            visibleCampaigns.map(draft => (
              <CampaignCard
                key={draft.id}
                campaign={draft}
                onEdit={onEditCampaign}
                onSchedule={onScheduleCampaign}
                onDeleteDraft={onDeleteDraft}
                onCancelCampaign={onCancelCampaign}
              />
            ))
          )}

          {hasHiddenCampaigns && (
            <button
              type="button"
              onClick={() => setShowAllCampaigns(current => !current)}
              aria-expanded={showAllCampaigns}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
            >
              {showAllCampaigns ? 'Thu gọn' : `Xem tất cả ${drafts.length} chiến dịch`}
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {showAllCampaigns ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>
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

interface CampaignCardProps {
  campaign: CampaignDraft;
  onEdit: (campaign: CampaignDraft) => void;
  onSchedule: (campaign: CampaignDraft) => void;
  onDeleteDraft: (id: string) => void;
  onCancelCampaign: (campaign: CampaignDraft) => void;
}

function CampaignCard({
  campaign,
  onEdit,
  onSchedule,
  onDeleteDraft,
  onCancelCampaign,
}: CampaignCardProps) {
  const typeConfig = campaignTypeConfig[campaign.type];
  const statusConfig = campaignStatusConfig[campaign.status];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 hover:border-blue-100 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${typeConfig.tone}`}>
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{typeConfig.icon}</span>
              {typeConfig.label}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusConfig.tone}`}>{statusConfig.label}</span>
          </div>
          <h3 className="font-extrabold text-slate-950 truncate">{campaign.name}</h3>
          <p className="text-sm text-slate-500 truncate mt-1">{campaign.subject}</p>
          <CampaignDeliverySummary campaign={campaign} />
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <button
              onClick={() => onSchedule(campaign)}
              className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
              title="Lên lịch gửi"
              aria-label={`Lên lịch gửi ${campaign.name}`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event_upcoming</span>
            </button>
          )}
          {campaign.status === 'SCHEDULED' && (
            <button
              onClick={() => onCancelCampaign(campaign)}
              className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors"
              title="Hủy lịch gửi"
              aria-label={`Hủy lịch gửi ${campaign.name}`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event_busy</span>
            </button>
          )}
          {campaign.status === 'DRAFT' && (
            <>
              <button
                onClick={() => onEdit(campaign)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                title="Mở bản nháp"
                aria-label={`Mở bản nháp ${campaign.name}`}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
              </button>
              <button
                onClick={() => onDeleteDraft(campaign.id)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
                title="Xóa bản nháp"
                aria-label={`Xóa bản nháp ${campaign.name}`}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignDeliverySummary({ campaign }: { campaign: CampaignDraft }) {
  const recipientEstimate = campaign.recipientEstimate;
  const processedCount = campaign.processedCount ?? 0;
  const sentCount = campaign.sentCount ?? 0;
  const failedCount = campaign.failedCount ?? 0;
  const progress = recipientEstimate > 0
    ? Math.min(100, Math.round((processedCount / recipientEstimate) * 100))
    : campaign.status === 'SENDING' ? 0 : 100;

  if (campaign.status === 'SENDING') {
    return (
      <div className="mt-3 max-w-md">
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <span className="text-amber-700">
            Đã xử lý {processedCount.toLocaleString('vi-VN')}/{recipientEstimate.toLocaleString('vi-VN')}
          </span>
          <span className="tabular-nums text-slate-400">{progress}%</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`Tiến độ gửi chiến dịch ${campaign.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-amber-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <ResultMetric icon="check_circle" label={`${sentCount.toLocaleString('vi-VN')} thành công`} tone="text-emerald-600" />
          <ResultMetric icon="error" label={`${failedCount.toLocaleString('vi-VN')} thất bại`} tone="text-rose-600" />
        </div>
      </div>
    );
  }

  if (campaign.status === 'SENT' || campaign.status === 'FAILED') {
    return (
      <div className="mt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <ResultMetric icon="check_circle" label={`${sentCount.toLocaleString('vi-VN')} gửi thành công`} tone="text-emerald-600" />
          <ResultMetric icon="error" label={`${failedCount.toLocaleString('vi-VN')} gửi thất bại`} tone="text-rose-600" />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {campaign.status === 'FAILED' && campaign.errorMessage
            ? campaign.errorMessage
            : `Hoàn tất ${formatDate(campaign.sentAt ?? campaign.updatedAt)}`}
        </p>
      </div>
    );
  }

  return (
    <p className="mt-2 text-xs text-slate-400">
      {recipientEstimate.toLocaleString('vi-VN')} người nhận dự kiến · {
        campaign.status === 'CANCELLED'
          ? `hủy lúc ${formatDate(campaign.cancelledAt ?? campaign.updatedAt)}`
          : campaign.scheduledAt
            ? `gửi lúc ${formatDate(campaign.scheduledAt)}`
            : `cập nhật ${formatDate(campaign.updatedAt)}`
      }
    </p>
  );
}

function ResultMetric({ icon, label, tone }: { icon: string; label: string; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${tone}`}>
      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
