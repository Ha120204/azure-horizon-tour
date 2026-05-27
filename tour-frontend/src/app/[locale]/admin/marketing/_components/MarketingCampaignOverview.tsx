'use client';

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
}

export function MarketingCampaignOverview({
  drafts,
  onCreateCampaign,
  onEditCampaign,
  onScheduleCampaign,
  onDeleteDraft,
}: MarketingCampaignOverviewProps) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 mb-7">
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">Bản nháp chiến dịch</h2>
            <p className="text-xs text-slate-500 mt-0.5">Soạn trước nội dung, gửi thử và lên lịch ở bước tiếp theo.</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">{drafts.length} bản nháp</span>
        </div>
        <div className="p-4 space-y-3">
          {drafts.length === 0 ? (
            <button
              onClick={onCreateCampaign}
              className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
            >
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">campaign</span>
              <p className="text-sm font-bold text-slate-800">Chưa có bản nháp chiến dịch</p>
              <p className="text-xs text-slate-500 mt-1">Bấm để tạo bản nháp email đầu tiên.</p>
            </button>
          ) : (
            drafts.slice(0, 4).map(draft => {
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
                          onClick={() => onScheduleCampaign(draft)}
                          className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                          title="Lên lịch gửi"
                        >
                          <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                        </button>
                      )}
                      <button
                        onClick={() => onEditCampaign(draft)}
                        disabled={draft.status !== 'DRAFT'}
                        className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                        title="Mở bản nháp"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteDraft(draft.id)}
                        className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
                        title="Xóa bản nháp"
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
