'use client';

import { ASSISTED_STATUS_CFG, SOURCE_CHANNEL_OPTIONS, getSelectOptionLabel } from '../_lib/config';
import { fmt, formatPassengerBreakdown } from '../_lib/helpers';
import type { AssistedDraft, AssistedDraftAction, DraftSelectOption } from '../_lib/types';
import { DraftSelect } from './DraftSelect';

const DRAFT_STATUS_FILTER_OPTIONS: DraftSelectOption[] = [
  { value: '', label: 'Tất cả trạng thái', icon: 'filter_list' },
  { value: 'DRAFT', label: 'Bản nháp', icon: 'draft' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt', icon: 'hourglass_top' },
  { value: 'NEEDS_REVISION', label: 'Cần sửa', icon: 'rate_review' },
  { value: 'REJECTED', label: 'Từ chối', icon: 'block' },
  { value: 'CONVERTED', label: 'Đã tạo đơn', icon: 'task_alt' },
];

interface AssistedBookingGridProps {
  drafts: AssistedDraft[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onRefresh: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  onEditDraft: (draft: AssistedDraft) => void;
  onRunAction: (draft: AssistedDraft, action: AssistedDraftAction) => void;
  canDeleteDraft: (draft: AssistedDraft) => boolean;
  onDeleteDraft: (draft: AssistedDraft) => void;
  onViewDraft: (draft: AssistedDraft) => void;
}

export function AssistedBookingGrid({
  drafts, isLoading, search, onSearchChange, statusFilter, onStatusFilterChange, onRefresh,
  isAdmin, isStaff, onEditDraft, onRunAction, canDeleteDraft, onDeleteDraft, onViewDraft,
}: AssistedBookingGridProps) {
  return (
    <>
      <div className="border-y border-slate-100 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Tìm draft, người đại diện, email, tên tour..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full sm:w-56">
            <DraftSelect
              value={statusFilter}
              options={DRAFT_STATUS_FILTER_OPTIONS}
              onChange={onStatusFilterChange}
              ariaLabel="Lọc trạng thái booking draft"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Làm mới
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Đang tải bản nháp...</div>
        ) : drafts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined">edit_document</span>
            </div>
            <p className="font-bold text-slate-800">Chưa có bản nháp đặt hộ</p>
            <p className="mt-1 text-sm text-slate-500">Tạo bản nháp đầu tiên khi khách đặt qua đội hỗ trợ.</p>
          </div>
        ) : drafts.slice(0, 6).map(draft => {
          const cfg = ASSISTED_STATUS_CFG[draft.status] ?? ASSISTED_STATUS_CFG.DRAFT;
          return (
            <div key={draft.id} className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-black text-blue-800">{draft.draftCode}</span>
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${cfg.badge}`}>
                    <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                    {cfg.label}
                  </span>
                  {draft.convertedBooking && <span className="text-xs font-semibold text-emerald-700">{draft.convertedBooking.bookingCode}</span>}
                </div>
                <p className="mt-2 truncate text-sm font-bold text-slate-900">{draft.customerName || 'Chưa nhập tên người đại diện'}</p>
                <p className="truncate text-xs text-slate-500">
                  {draft.customerEmail || 'Chưa nhập email'}{draft.customerPhone ? ` · ${draft.customerPhone}` : ''}{draft.customerIdentityNo ? ` · CCCD ${draft.customerIdentityNo}` : ''}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{draft.tour?.name ?? `Tour #${draft.tourId}`}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPassengerBreakdown(draft.passengers, draft.numberOfPeople)} · {fmt(draft.quotedPrice)} · {getSelectOptionLabel(SOURCE_CHANNEL_OPTIONS, draft.sourceChannel, draft.sourceChannel)}
                </p>
                {draft.rejectionReason && <p className="mt-1 line-clamp-1 text-xs font-medium text-orange-700">{draft.rejectionReason}</p>}
              </div>
              <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {['DRAFT', 'NEEDS_REVISION'].includes(draft.status) && (
                  <>
                    <button onClick={() => onEditDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      Chỉnh sửa
                    </button>
                    {isStaff && (
                      <button onClick={() => onRunAction(draft, 'submit')} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                        Gửi duyệt
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => onRunAction(draft, 'approve')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                        Duyệt tạo đơn
                      </button>
                    )}
                  </>
                )}
                {canDeleteDraft(draft) && (
                  <button onClick={() => onDeleteDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    Xóa
                  </button>
                )}
                <button onClick={() => onViewDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50">
                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                  Chi tiết
                </button>
                {isAdmin && draft.status === 'PENDING_APPROVAL' && (
                  <>
                    <button onClick={() => onRunAction(draft, 'approve')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                      Duyệt
                    </button>
                    <button onClick={() => onRunAction(draft, 'request-revision')} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">
                      Yêu cầu sửa
                    </button>
                    <button onClick={() => onRunAction(draft, 'reject')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
