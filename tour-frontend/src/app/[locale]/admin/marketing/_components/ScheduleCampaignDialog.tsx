'use client';

import { useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  buildLocalScheduleValue,
  formatDate,
  getLocalDatePart,
  normalizeTimeInput,
  sanitizeTimeInput,
  toDateTimeLocalValue,
} from '../_lib/helpers';
import type { CampaignDraft } from '../_lib/types';

interface ScheduleCampaignDialogProps {
  campaign: CampaignDraft;
  scheduleDate: string;
  setScheduleDate: Dispatch<SetStateAction<string>>;
  scheduleHour: string;
  setScheduleHour: Dispatch<SetStateAction<string>>;
  scheduleMinute: string;
  setScheduleMinute: Dispatch<SetStateAction<string>>;
  scheduleError: string;
  setScheduleError: Dispatch<SetStateAction<string>>;
  isScheduling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ScheduleCampaignDialog({
  campaign,
  scheduleDate,
  setScheduleDate,
  scheduleHour,
  setScheduleHour,
  scheduleMinute,
  setScheduleMinute,
  scheduleError,
  setScheduleError,
  isScheduling,
  onCancel,
  onConfirm,
}: ScheduleCampaignDialogProps) {
  const schedulePreviewAt = useMemo(() => {
    const localValue = buildLocalScheduleValue(scheduleDate, scheduleHour, scheduleMinute);
    if (!localValue) return '';
    const date = new Date(localValue);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }, [scheduleDate, scheduleHour, scheduleMinute]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/55" onClick={onCancel} aria-label="Đóng lịch gửi" />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">event_upcoming</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 mb-1">Lên lịch chiến dịch</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Lên lịch gửi</h2>
          <p className="text-sm text-slate-500 mt-2">
            Chiến dịch <strong className="text-slate-900">{campaign.name}</strong> sẽ được hệ thống kiểm tra mỗi phút và gửi khi đến hạn.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">Người nhận dự kiến</span>
              <span className="font-extrabold text-blue-700 tabular-nums">{campaign.recipientEstimate.toLocaleString('vi-VN')}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Chỉ gửi cho người đăng ký đang nhận tin. Email tạm dừng sẽ tự bị loại.</p>
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
                      setScheduleDate(e.target.value);
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
            onClick={onCancel}
            className="h-10 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
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
  );
}
