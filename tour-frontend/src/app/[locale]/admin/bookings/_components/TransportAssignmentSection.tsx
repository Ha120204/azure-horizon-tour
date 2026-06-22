'use client';

import type React from 'react';
import { useState } from 'react';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { API_BASE_URL } from '@/lib/http/constants';
import { fmtDateTime } from '../_lib/helpers';
import type { BookingTransportAssignment } from '../_lib/types';

type TransportForm = {
  outboundTicketCodes: string;
  outboundSeatNumbers: string;
  outboundPnrCode: string;
  returnTicketCodes: string;
  returnSeatNumbers: string;
  returnPnrCode: string;
  vehiclePlate: string;
  seatNumbers: string;
  notes: string;
};

function parseLines(val: string): string[] {
  return val.split('\n').map(s => s.trim()).filter(Boolean);
}

function assignmentToForm(a: BookingTransportAssignment): TransportForm {
  return {
    outboundTicketCodes: a.outboundTicketCodes.join('\n'),
    outboundSeatNumbers: a.outboundSeatNumbers.join('\n'),
    outboundPnrCode: a.outboundPnrCode ?? '',
    returnTicketCodes: a.returnTicketCodes.join('\n'),
    returnSeatNumbers: a.returnSeatNumbers.join('\n'),
    returnPnrCode: a.returnPnrCode ?? '',
    vehiclePlate: a.vehiclePlate ?? '',
    seatNumbers: a.seatNumbers.join('\n'),
    notes: a.notes ?? '',
  };
}

const EMPTY_FORM: TransportForm = {
  outboundTicketCodes: '',
  outboundSeatNumbers: '',
  outboundPnrCode: '',
  returnTicketCodes: '',
  returnSeatNumbers: '',
  returnPnrCode: '',
  vehiclePlate: '',
  seatNumbers: '',
  notes: '',
};

type TransportMode = 'FLIGHT' | 'VEHICLE';

// Suy luận tab mặc định từ dữ liệu đã gán: nếu chỉ có thông tin xe thì mở tab Xe.
function inferMode(a: BookingTransportAssignment | null | undefined): TransportMode {
  if (!a) return 'FLIGHT';
  const hasVehicle = Boolean(a.vehiclePlate) || a.seatNumbers.length > 0;
  const hasFlight =
    a.outboundTicketCodes.length > 0 || Boolean(a.outboundPnrCode) || a.returnTicketCodes.length > 0;
  return hasVehicle && !hasFlight ? 'VEHICLE' : 'FLIGHT';
}

export function TransportAssignmentSection({ bookingId, initial }: { bookingId: number; initial: BookingTransportAssignment | null | undefined }) {
  const [assignment, setAssignment] = useState<BookingTransportAssignment | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TransportMode>(inferMode(initial));
  const [form, setForm] = useState<TransportForm>(initial ? assignmentToForm(initial) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field: keyof TransportForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleOpen = () => {
    setForm(assignment ? assignmentToForm(assignment) : EMPTY_FORM);
    setMode(inferMode(assignment));
    setError('');
    setSuccess('');
    setOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/booking/${bookingId}/transport`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outboundTicketCodes: parseLines(form.outboundTicketCodes),
          outboundSeatNumbers: parseLines(form.outboundSeatNumbers),
          outboundPnrCode: form.outboundPnrCode.trim() || undefined,
          returnTicketCodes: parseLines(form.returnTicketCodes),
          returnSeatNumbers: parseLines(form.returnSeatNumbers),
          returnPnrCode: form.returnPnrCode.trim() || undefined,
          vehiclePlate: form.vehiclePlate.trim() || undefined,
          seatNumbers: parseLines(form.seatNumbers),
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Không lưu được thông tin vé');
      setAssignment(json.data ?? json);
      setOpen(false);
      setSuccess('Đã lưu thông tin vé thành công.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40';
  const textareaCls = `${inputCls} resize-none`;
  const labelCls = 'block text-xs font-semibold text-on-surface-variant mb-1';

  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[14px]">airplane_ticket</span>
          Phương tiện &amp; Vé
        </span>
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-primary text-[11px] font-bold hover:bg-primary/10 transition-colors normal-case tracking-normal"
        >
          <span className="material-symbols-outlined text-[13px]">edit</span>
          {assignment ? 'Cập nhật vé' : 'Gán thông tin vé'}
        </button>
      </h3>

      {/* Success banner */}
      {success && !open && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          {success}
        </div>
      )}

      {/* Existing assignment display */}
      {assignment && !open && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm space-y-3">
          {(assignment.outboundTicketCodes.length > 0 || assignment.outboundPnrCode) && (
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                <span className="material-symbols-outlined text-[14px]">flight_takeoff</span>
                Chiều đi
              </p>
              <div className="space-y-1 text-xs">
                {assignment.outboundPnrCode && <div className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">PNR</span><span className="font-mono font-bold">{assignment.outboundPnrCode}</span></div>}
                {assignment.outboundTicketCodes.map((c, i) => <div key={i} className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">Vé {i + 1}</span><span className="font-mono font-bold">{c}</span></div>)}
                {assignment.outboundSeatNumbers.length > 0 && <div className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">Ghế</span><span className="font-mono font-bold">{assignment.outboundSeatNumbers.join(', ')}</span></div>}
              </div>
            </div>
          )}
          {(assignment.returnTicketCodes.length > 0 || assignment.returnPnrCode) && (
            <div className="border-t border-blue-100 pt-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                <span className="material-symbols-outlined text-[14px]">flight_land</span>
                Chiều về
              </p>
              <div className="space-y-1 text-xs">
                {assignment.returnPnrCode && <div className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">PNR</span><span className="font-mono font-bold">{assignment.returnPnrCode}</span></div>}
                {assignment.returnTicketCodes.map((c, i) => <div key={i} className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">Vé {i + 1}</span><span className="font-mono font-bold">{c}</span></div>)}
                {assignment.returnSeatNumbers.length > 0 && <div className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">Ghế</span><span className="font-mono font-bold">{assignment.returnSeatNumbers.join(', ')}</span></div>}
              </div>
            </div>
          )}
          {(assignment.vehiclePlate || assignment.seatNumbers.length > 0) && (
            <div className="border-t border-blue-100 pt-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                <span className="material-symbols-outlined text-[14px]">directions_bus</span>
                Xe
              </p>
              <div className="space-y-1 text-xs">
                {assignment.vehiclePlate && <div className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">Biển số</span><span className="font-mono font-bold">{assignment.vehiclePlate}</span></div>}
                {assignment.seatNumbers.length > 0 && <div className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">Ghế</span><span className="font-mono font-bold">{assignment.seatNumbers.join(', ')}</span></div>}
              </div>
            </div>
          )}
          {assignment.notes && <p className="border-t border-blue-100 pt-3 text-xs text-slate-500">{assignment.notes}</p>}
          <p className="text-[11px] text-slate-400">Gán lúc {fmtDateTime(assignment.assignedAt)}</p>
        </div>
      )}

      {/* Empty state */}
      {!assignment && !open && (
        <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low p-4 text-center text-sm text-on-surface-variant">
          Chưa có thông tin vé nào được gán cho đơn này.
        </div>
      )}

      {/* Form */}
      {open && (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Chọn loại phương tiện */}
          <div className="flex gap-2">
            {([['FLIGHT', 'Máy bay', 'flight'], ['VEHICLE', 'Xe khách', 'directions_bus']] as const).map(([value, label, icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${mode === value ? 'border-primary bg-primary text-white' : 'border-outline-variant/20 bg-surface text-on-surface-variant hover:border-primary/40'}`}
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Máy bay: Chiều đi + Chiều về */}
          {mode === 'FLIGHT' && (
          <>
          {/* Chiều đi */}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-3">
              <span className="material-symbols-outlined text-[14px]">flight_takeoff</span>
              Chiều đi
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Mã vé — mỗi vé một dòng</label>
                <textarea rows={3} className={textareaCls} placeholder={"0552123456789\n0552987654321"} value={form.outboundTicketCodes} onChange={set('outboundTicketCodes')} />
              </div>
              <div>
                <label className={labelCls}>Số ghế — mỗi ghế một dòng</label>
                <textarea rows={2} className={textareaCls} placeholder={"12A\n12B"} value={form.outboundSeatNumbers} onChange={set('outboundSeatNumbers')} />
              </div>
              <div>
                <label className={labelCls}>Mã PNR</label>
                <input type="text" className={inputCls} placeholder="VN-ABC123" value={form.outboundPnrCode} onChange={set('outboundPnrCode')} />
              </div>
            </div>
          </div>

          {/* Chiều về */}
          <div className="border-t border-outline-variant/10 pt-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-3">
              <span className="material-symbols-outlined text-[14px]">flight_land</span>
              Chiều về
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Mã vé — mỗi vé một dòng</label>
                <textarea rows={3} className={textareaCls} placeholder={"0552123456789\n0552987654321"} value={form.returnTicketCodes} onChange={set('returnTicketCodes')} />
              </div>
              <div>
                <label className={labelCls}>Số ghế — mỗi ghế một dòng</label>
                <textarea rows={2} className={textareaCls} placeholder={"12A\n12B"} value={form.returnSeatNumbers} onChange={set('returnSeatNumbers')} />
              </div>
              <div>
                <label className={labelCls}>Mã PNR</label>
                <input type="text" className={inputCls} placeholder="VN-DEF456" value={form.returnPnrCode} onChange={set('returnPnrCode')} />
              </div>
            </div>
          </div>

          </>
          )}

          {/* Xe */}
          {mode === 'VEHICLE' && (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">
              <span className="material-symbols-outlined text-[14px]">directions_bus</span>
              Xe khách / ô tô
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Biển số xe</label>
                <input type="text" className={inputCls} placeholder="51B-123.45" value={form.vehiclePlate} onChange={set('vehiclePlate')} />
              </div>
              <div>
                <label className={labelCls}>Số ghế — mỗi ghế một dòng</label>
                <textarea rows={2} className={textareaCls} placeholder={"A1\nA2"} value={form.seatNumbers} onChange={set('seatNumbers')} />
              </div>
            </div>
          </div>
          )}

          {/* Ghi chú */}
          <div className="border-t border-outline-variant/10 pt-4">
            <label className={labelCls}>Ghi chú nội bộ</label>
            <textarea rows={2} className={textareaCls} placeholder="Ví dụ: hành lý ký gửi 20kg..." value={form.notes} onChange={set('notes')} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
              Lưu thông tin vé
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
