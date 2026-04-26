'use client';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

const HIGHLIGHT_ICONS = [
  { value: 'auto_awesome', label: 'Nổi bật' },
  { value: 'scuba_diving', label: 'Lặn biển' },
  { value: 'beach_access', label: 'Bãi biển' },
  { value: 'restaurant', label: 'Ẩm thực' },
  { value: 'hotel', label: 'Khách sạn' },
  { value: 'directions_boat', label: 'Tàu thuyền' },
  { value: 'photo_camera', label: 'Chụp ảnh' },
  { value: 'hiking', label: 'Trekking' },
  { value: 'museum', label: 'Văn hóa' },
  { value: 'local_activity', label: 'Hoạt động' },
  { value: 'spa', label: 'Spa' },
  { value: 'festival', label: 'Lễ hội' },
];

interface TourContentDrawerProps {
  tour: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function TourContentDrawer({ tour, onClose, onSuccess }: TourContentDrawerProps) {
  const [tab, setTab] = useState<'highlights' | 'faqs' | 'itinerary'>('highlights');
  const [isSaving, setIsSaving] = useState(false);

  // ── Highlights state ──────────────────────────────────────────
  const [highlights, setHighlights] = useState<{ content: string; icon: string }[]>([]);

  // ── FAQs state ────────────────────────────────────────────────
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);

  // ── Itinerary state ───────────────────────────────────────────
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [savingDayId, setSavingDayId] = useState<number | null>(null);

  // Pre-fill from tour data
  useEffect(() => {
    if (!tour) return;
    setHighlights(tour.highlights?.length > 0
      ? tour.highlights.map((h: any) => ({ content: h.content, icon: h.icon || 'auto_awesome' }))
      : [{ content: '', icon: 'auto_awesome' }]
    );
    setFaqs(tour.faqs?.length > 0
      ? tour.faqs.map((f: any) => ({ question: f.question, answer: f.answer }))
      : [{ question: '', answer: '' }]
    );
    setItinerary(tour.itinerary?.length > 0
      ? tour.itinerary.map((d: any) => ({
          ...d,
          activitiesText: Array.isArray(d.activities) ? d.activities.join('\n') : '',
          timelineText: Array.isArray(d.timeline)
            ? d.timeline.map((t: any) => `${t.time} - ${t.activity}`).join('\n')
            : '',
        }))
      : []
    );
  }, [tour]);

  // ── Save Highlights ───────────────────────────────────────────
  const saveHighlights = async () => {
    setIsSaving(true);
    try {
      const valid = highlights.filter(h => h.content.trim());
      const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/highlights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlights: valid }),
      });
      if (!res.ok) throw new Error();
      onSuccess('Đã lưu điểm nổi bật!');
    } catch { onSuccess('Lỗi khi lưu. Vui lòng thử lại.'); }
    finally { setIsSaving(false); }
  };

  // ── Save FAQs ─────────────────────────────────────────────────
  const saveFaqs = async () => {
    setIsSaving(true);
    try {
      const valid = faqs.filter(f => f.question.trim() && f.answer.trim());
      const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/faqs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs: valid }),
      });
      if (!res.ok) throw new Error();
      onSuccess('Đã lưu FAQ!');
    } catch { onSuccess('Lỗi khi lưu. Vui lòng thử lại.'); }
    finally { setIsSaving(false); }
  };

  // ── Save Itinerary Day ────────────────────────────────────────
  const saveDay = async (day: any) => {
    setSavingDayId(day.id);
    try {
      const activities = day.activitiesText.split('\n').map((s: string) => s.trim()).filter(Boolean);
      const timeline = day.timelineText.split('\n').map((line: string) => {
        const [time, ...rest] = line.split('-');
        return { time: time?.trim() || '', activity: rest.join('-').trim() };
      }).filter((t: any) => t.time && t.activity);
      const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/itinerary/${day.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: day.title,
          description: day.description,
          mealsBreakfast: !!day.mealsBreakfast,
          mealsLunch: !!day.mealsLunch,
          mealsDinner: !!day.mealsDinner,
          accommodation: day.accommodation || null,
          transport: day.transport || null,
          activities,
          timeline,
        }),
      });
      if (!res.ok) throw new Error();
      onSuccess(`Đã lưu Ngày ${day.dayNumber}!`);
    } catch { onSuccess('Lỗi khi lưu ngày. Vui lòng thử lại.'); }
    finally { setSavingDayId(null); }
  };

  const updateDay = (id: number, field: string, value: any) => {
    setItinerary(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const sectionBtn = (id: typeof tab, icon: string, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-surface-container-lowest flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container" />
          <div className="relative z-[1] px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-lg font-bold text-white">Nội dung Tour</h2>
              <p className="text-white/60 text-xs mt-0.5 truncate max-w-[260px]">{tour?.name}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 p-3 bg-surface-container/50 border-b border-outline-variant/10">
          {sectionBtn('highlights', 'auto_awesome', 'Nổi bật')}
          {sectionBtn('faqs', 'help', 'FAQ')}
          {sectionBtn('itinerary', 'calendar_month', 'Lịch trình')}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── HIGHLIGHTS ── */}
          {tab === 'highlights' && (
            <>
              <p className="text-xs text-on-surface-variant">Mỗi điểm nổi bật hiển thị dạng chip trên trang chi tiết tour. Thêm 5–7 điểm là lý tưởng.</p>
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 bg-surface-container-low/50 rounded-2xl p-3 border border-outline-variant/10">
                  <select
                    value={h.icon}
                    onChange={e => setHighlights(prev => prev.map((x, xi) => xi === i ? { ...x, icon: e.target.value } : x))}
                    className="bg-white border border-outline-variant/20 rounded-xl px-2 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary w-28 shrink-0"
                  >
                    {HIGHLIGHT_ICONS.map(ic => (
                      <option key={ic.value} value={ic.value}>{ic.label}</option>
                    ))}
                  </select>
                  <input
                    value={h.content}
                    onChange={e => setHighlights(prev => prev.map((x, xi) => xi === i ? { ...x, content: e.target.value } : x))}
                    placeholder="Ví dụ: Lặn ngắm san hô tại Hòn Mun..."
                    className="flex-1 bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <button onClick={() => setHighlights(prev => prev.filter((_, xi) => xi !== i))} className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
              <button onClick={() => setHighlights(prev => [...prev, { content: '', icon: 'auto_awesome' }])} className="w-full py-2.5 border-2 border-dashed border-outline-variant/30 rounded-2xl text-sm text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span> Thêm điểm nổi bật
              </button>
            </>
          )}

          {/* ── FAQs ── */}
          {tab === 'faqs' && (
            <>
              <p className="text-xs text-on-surface-variant">Câu hỏi thường gặp hiển thị dạng accordion. Giúp khách hiểu rõ tour và giảm tải cho bộ phận tư vấn.</p>
              {faqs.map((f, i) => (
                <div key={i} className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider w-4">Q{i + 1}</span>
                    <input
                      value={f.question}
                      onChange={e => setFaqs(prev => prev.map((x, xi) => xi === i ? { ...x, question: e.target.value } : x))}
                      placeholder="Câu hỏi..."
                      className="flex-1 bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button onClick={() => setFaqs(prev => prev.filter((_, xi) => xi !== i))} className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  <textarea
                    value={f.answer}
                    onChange={e => setFaqs(prev => prev.map((x, xi) => xi === i ? { ...x, answer: e.target.value } : x))}
                    placeholder="Câu trả lời..."
                    rows={3}
                    className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none ml-6"
                  />
                </div>
              ))}
              <button onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])} className="w-full py-2.5 border-2 border-dashed border-outline-variant/30 rounded-2xl text-sm text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span> Thêm câu hỏi
              </button>
            </>
          )}

          {/* ── ITINERARY ── */}
          {tab === 'itinerary' && (
            <>
              {itinerary.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">event_note</span>
                  <p className="text-sm">Chưa có lịch trình. Hãy tạo lịch trình trong phần chỉnh sửa tour trước.</p>
                </div>
              ) : itinerary.map((day) => (
                <div key={day.id} className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10 space-y-3">
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">{day.dayNumber}</div>
                      <input
                        value={day.title}
                        onChange={e => updateDay(day.id, 'title', e.target.value)}
                        className="font-semibold text-sm bg-transparent border-b border-outline-variant/30 focus:border-primary outline-none pb-0.5 flex-1 min-w-0"
                      />
                    </div>
                    <button
                      onClick={() => saveDay(day)}
                      disabled={savingDayId === day.id}
                      className="px-3 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1"
                    >
                      {savingDayId === day.id
                        ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-[14px]">save</span>}
                      Lưu
                    </button>
                  </div>
                  {/* Description */}
                  <textarea
                    value={day.description}
                    onChange={e => updateDay(day.id, 'description', e.target.value)}
                    rows={2}
                    placeholder="Mô tả ngày..."
                    className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                  />
                  {/* Meals */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Bữa ăn:</span>
                    {[
                      { key: 'mealsBreakfast', label: 'Sáng' },
                      { key: 'mealsLunch', label: 'Trưa' },
                      { key: 'mealsDinner', label: 'Tối' },
                    ].map(m => (
                      <label key={m.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!day[m.key]} onChange={e => updateDay(day.id, m.key, e.target.checked)} className="accent-primary w-3.5 h-3.5" />
                        <span className="text-xs text-on-surface-variant">{m.label}</span>
                      </label>
                    ))}
                  </div>
                  {/* Accommodation & Transport */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Khách sạn</label>
                      <input value={day.accommodation || ''} onChange={e => updateDay(day.id, 'accommodation', e.target.value)} placeholder="Vinpearl Resort 5★" className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Phương tiện</label>
                      <input value={day.transport || ''} onChange={e => updateDay(day.id, 'transport', e.target.value)} placeholder="Xe du lịch 45 chỗ" className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    </div>
                  </div>
                  {/* Activities */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Địa điểm tham quan (mỗi dòng 1 nơi)</label>
                    <textarea value={day.activitiesText || ''} onChange={e => updateDay(day.id, 'activitiesText', e.target.value)} rows={2} placeholder={"Hòn Mun\nHòn Tằm"} className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none" />
                  </div>
                  {/* Timeline */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Timeline (format: HH:MM - Hoạt động)</label>
                    <textarea value={day.timelineText || ''} onChange={e => updateDay(day.id, 'timelineText', e.target.value)} rows={3} placeholder={"07:00 - Ăn sáng tại khách sạn\n08:30 - Khởi hành"} className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none font-mono" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {(tab === 'highlights' || tab === 'faqs') && (
          <div className="shrink-0 p-4 border-t border-outline-variant/10 bg-surface-container-lowest flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
              Hủy
            </button>
            <button
              onClick={tab === 'highlights' ? saveHighlights : saveFaqs}
              disabled={isSaving}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-base">save</span>}
              Lưu {tab === 'highlights' ? 'Điểm Nổi Bật' : 'FAQ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
