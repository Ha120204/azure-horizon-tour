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
  const [highlights, setHighlights] = useState<{ content: string; contentEn: string; icon: string }[]>([]);

  // ── FAQs state ────────────────────────────────────────────────
  const [faqs, setFaqs] = useState<{ question: string; questionEn: string; answer: string; answerEn: string }[]>([]);

  // ── Itinerary state ───────────────────────────────────────────
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [savingDayId, setSavingDayId] = useState<number | null>(null);

  // Pre-fill from tour data
  useEffect(() => {
    if (!tour) return;
    setHighlights(tour.highlights?.length > 0
      ? tour.highlights.map((h: any) => ({ content: h.content, contentEn: h.contentEn || '', icon: h.icon || 'auto_awesome' }))
      : [{ content: '', contentEn: '', icon: 'auto_awesome' }]
    );
    setFaqs(tour.faqs?.length > 0
      ? tour.faqs.map((f: any) => ({ question: f.question, questionEn: f.questionEn || '', answer: f.answer, answerEn: f.answerEn || '' }))
      : [{ question: '', questionEn: '', answer: '', answerEn: '' }]
    );
    setItinerary(tour.itinerary?.length > 0
      ? tour.itinerary.map((d: any) => ({
          ...d,
          activitiesText: Array.isArray(d.activities) ? d.activities.join('\n') : '',
          activitiesEnText: Array.isArray(d.activitiesEn) ? d.activitiesEn.join('\n') : '',
          timelineText: Array.isArray(d.timeline)
            ? d.timeline.map((t: any) => `${t.time} - ${t.activity}`).join('\n')
            : '',
          timelineEnText: Array.isArray(d.timelineEn)
            ? d.timelineEn.map((t: any) => `${t.time} - ${t.activity}`).join('\n')
            : '',
        }))
      : []
    );
  }, [tour]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      const activitiesEn = (day.activitiesEnText || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
      const timeline = day.timelineText.split('\n').map((line: string) => {
        const [time, ...rest] = line.split('-');
        return { time: time?.trim() || '', activity: rest.join('-').trim() };
      }).filter((t: any) => t.time && t.activity);
      const timelineEn = (day.timelineEnText || '').split('\n').map((line: string) => {
        const [time, ...rest] = line.split('-');
        return { time: time?.trim() || '', activity: rest.join('-').trim() };
      }).filter((t: any) => t.time && t.activity);
      const res = await fetchWithAuth(`${API_BASE_URL}/tour/${tour.id}/itinerary/${day.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: day.title,
          titleEn: day.titleEn || null,
          description: day.description,
          descriptionEn: day.descriptionEn || null,
          mealsBreakfast: !!day.mealsBreakfast,
          mealsLunch: !!day.mealsLunch,
          mealsDinner: !!day.mealsDinner,
          accommodation: day.accommodation || null,
          accommodationEn: day.accommodationEn || null,
          transport: day.transport || null,
          transportEn: day.transportEn || null,
          activities,
          activitiesEn,
          timeline,
          timelineEn,
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

  const tabConfig = [
    { id: 'highlights' as const, icon: 'auto_awesome', label: 'Nổi bật' },
    { id: 'faqs' as const, icon: 'help_outline', label: 'FAQ' },
    { id: 'itinerary' as const, icon: 'calendar_month', label: 'Lịch trình' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '90vh',
          animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.92) translateY(20px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* ── Header ── */}
        <div className="relative overflow-hidden shrink-0">
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #2196F3 100%)' }}
          />
          {/* Decorative circles */}
          <div
            className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
            style={{ background: 'white' }}
          />
          <div
            className="absolute -bottom-4 right-16 w-16 h-16 rounded-full opacity-10"
            style={{ background: 'white' }}
          />
          <div className="relative z-[1] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              >
                <span className="material-symbols-outlined text-white text-[20px]">
                  {tab === 'highlights' ? 'auto_awesome' : tab === 'faqs' ? 'help_outline' : 'calendar_month'}
                </span>
              </div>
              <div>
                <h2 className="font-bold text-lg text-white leading-tight">Nội dung Tour</h2>
                <p className="text-white/60 text-xs mt-0.5 truncate max-w-[280px]">{tour?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <span className="material-symbols-outlined text-white text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1.5 px-4 pt-3 pb-0 bg-white border-b border-gray-100 shrink-0">
          {tabConfig.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 -mb-px"
              style={
                tab === id
                  ? { color: '#1565C0', borderBottomColor: '#1565C0', background: '#EFF6FF' }
                  : { color: '#6B7280', borderBottomColor: 'transparent', background: 'transparent' }
              }
            >
              <span className="material-symbols-outlined text-[17px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50">

          {/* ── HIGHLIGHTS ── */}
          {tab === 'highlights' && (
            <>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="material-symbols-outlined text-blue-500 text-[16px] mt-0.5 shrink-0">info</span>
                <p className="text-xs text-blue-700">Mỗi điểm nổi bật hiển thị dạng chip trên trang chi tiết tour. Thêm 5–7 điểm là lý tưởng.</p>
              </div>
              <div className="space-y-2">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5 border border-gray-200 shadow-sm hover:border-blue-200 transition-colors"
                  >
                    <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">drag_indicator</span>
                    <select
                      value={h.icon}
                      onChange={e => setHighlights(prev => prev.map((x, xi) => xi === i ? { ...x, icon: e.target.value } : x))}
                      className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-300 w-28 shrink-0 bg-gray-50"
                    >
                      {HIGHLIGHT_ICONS.map(ic => (
                        <option key={ic.value} value={ic.value}>{ic.label}</option>
                      ))}
                    </select>
                    <input
                      value={h.content}
                      onChange={e => setHighlights(prev => prev.map((x, xi) => xi === i ? { ...x, content: e.target.value } : x))}
                      placeholder="Ví dụ: Lặn ngắm san hô tại Hòn Mun..."
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                    <input
                      value={h.contentEn}
                      onChange={e => setHighlights(prev => prev.map((x, xi) => xi === i ? { ...x, contentEn: e.target.value } : x))}
                      placeholder="English highlight..."
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                    <button
                      onClick={() => setHighlights(prev => prev.filter((_, xi) => xi !== i))}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setHighlights(prev => [...prev, { content: '', contentEn: '', icon: 'auto_awesome' }])}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Thêm điểm nổi bật
              </button>
            </>
          )}

          {/* ── FAQs ── */}
          {tab === 'faqs' && (
            <>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="material-symbols-outlined text-blue-500 text-[16px] mt-0.5 shrink-0">info</span>
                <p className="text-xs text-blue-700">Câu hỏi thường gặp hiển thị dạng accordion. Giúp khách hiểu rõ tour và giảm tải cho bộ phận tư vấn.</p>
              </div>
              <div className="space-y-2.5">
                {faqs.map((f, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:border-blue-200 transition-colors space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0">Q{i + 1}</span>
                      <input
                        value={f.question}
                        onChange={e => setFaqs(prev => prev.map((x, xi) => xi === i ? { ...x, question: e.target.value } : x))}
                        placeholder="Nhập câu hỏi..."
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                      />
                      <button
                        onClick={() => setFaqs(prev => prev.filter((_, xi) => xi !== i))}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                    <textarea
                      value={f.answer}
                      onChange={e => setFaqs(prev => prev.map((x, xi) => xi === i ? { ...x, answer: e.target.value } : x))}
                      placeholder="Nhập câu trả lời..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-gray-50"
                    />
                    <input
                      value={f.questionEn}
                      onChange={e => setFaqs(prev => prev.map((x, xi) => xi === i ? { ...x, questionEn: e.target.value } : x))}
                      placeholder="Question in English..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                    />
                    <textarea
                      value={f.answerEn}
                      onChange={e => setFaqs(prev => prev.map((x, xi) => xi === i ? { ...x, answerEn: e.target.value } : x))}
                      placeholder="Answer in English..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-gray-50"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setFaqs(prev => [...prev, { question: '', questionEn: '', answer: '', answerEn: '' }])}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Thêm câu hỏi
              </button>
            </>
          )}

          {/* ── ITINERARY ── */}
          {tab === 'itinerary' && (
            <>
              {itinerary.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">event_note</span>
                  <p className="text-sm font-medium">Chưa có lịch trình</p>
                  <p className="text-xs mt-1 opacity-70">Hãy tạo lịch trình trong phần chỉnh sửa tour trước.</p>
                </div>
              ) : itinerary.map((day) => (
                <div key={day.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1565C0, #2196F3)' }}
                      >
                        {day.dayNumber}
                      </div>
                      <input
                        value={day.title}
                        onChange={e => updateDay(day.id, 'title', e.target.value)}
                        className="font-semibold text-sm border-0 border-b border-gray-200 focus:border-blue-400 outline-none pb-0.5 flex-1 min-w-0 bg-transparent"
                      />
                    </div>
                    <button
                      onClick={() => saveDay(day)}
                      disabled={savingDayId === day.id}
                      className="ml-3 px-3 py-1.5 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1565C0, #2196F3)' }}
                    >
                      {savingDayId === day.id
                        ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-[14px]">save</span>}
                      Lưu
                    </button>
                  </div>

                  {/* Description */}
                  <input
                    value={day.titleEn || ''}
                    onChange={e => updateDay(day.id, 'titleEn', e.target.value)}
                    placeholder="Day title in English..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <textarea
                    value={day.description}
                    onChange={e => updateDay(day.id, 'description', e.target.value)}
                    rows={2}
                    placeholder="Mô tả ngày..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                  <textarea
                    value={day.descriptionEn || ''}
                    onChange={e => updateDay(day.id, 'descriptionEn', e.target.value)}
                    rows={2}
                    placeholder="Day description in English..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />

                  {/* Meals */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bữa ăn:</span>
                    {[
                      { key: 'mealsBreakfast', label: 'Sáng', icon: '☀️' },
                      { key: 'mealsLunch', label: 'Trưa', icon: '🌤️' },
                      { key: 'mealsDinner', label: 'Tối', icon: '🌙' },
                    ].map(m => (
                      <label key={m.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!day[m.key]}
                          onChange={e => updateDay(day.id, m.key, e.target.checked)}
                          className="accent-blue-600 w-3.5 h-3.5"
                        />
                        <span className="text-xs text-gray-600">{m.icon} {m.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Accommodation & Transport */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        🏨 Khách sạn
                      </label>
                      <input
                        value={day.accommodation || ''}
                        onChange={e => updateDay(day.id, 'accommodation', e.target.value)}
                        placeholder="Vinpearl Resort 5★"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <input
                        value={day.accommodationEn || ''}
                        onChange={e => updateDay(day.id, 'accommodationEn', e.target.value)}
                        placeholder="Accommodation in English"
                        className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        🚌 Phương tiện
                      </label>
                      <input
                        value={day.transport || ''}
                        onChange={e => updateDay(day.id, 'transport', e.target.value)}
                        placeholder="Xe du lịch 45 chỗ"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <input
                        value={day.transportEn || ''}
                        onChange={e => updateDay(day.id, 'transportEn', e.target.value)}
                        placeholder="Transport in English"
                        className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      📍 Địa điểm tham quan (mỗi dòng 1 nơi)
                    </label>
                    <textarea
                      value={day.activitiesText || ''}
                      onChange={e => updateDay(day.id, 'activitiesText', e.target.value)}
                      rows={2}
                      placeholder={"Hòn Mun\nHòn Tằm"}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />
                    <textarea
                      value={day.activitiesEnText || ''}
                      onChange={e => updateDay(day.id, 'activitiesEnText', e.target.value)}
                      rows={2}
                      placeholder={"Hon Mun\nHon Tam"}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />
                  </div>

                  {/* Timeline */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      ⏰ Timeline (format: HH:MM - Hoạt động)
                    </label>
                    <textarea
                      value={day.timelineText || ''}
                      onChange={e => updateDay(day.id, 'timelineText', e.target.value)}
                      rows={3}
                      placeholder={"07:00 - Ăn sáng tại khách sạn\n08:30 - Khởi hành"}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-none font-mono"
                    />
                    <textarea
                      value={day.timelineEnText || ''}
                      onChange={e => updateDay(day.id, 'timelineEnText', e.target.value)}
                      rows={3}
                      placeholder={"07:00 - Breakfast at hotel\n08:30 - Departure"}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-none font-mono"
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {(tab === 'highlights' || tab === 'faqs') && (
          <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex gap-3 items-center">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={tab === 'highlights' ? saveHighlights : saveFaqs}
              disabled={isSaving}
              className="flex-1 py-2.5 text-white rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1565C0 0%, #2196F3 100%)' }}
            >
              {isSaving
                ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-base">save</span>}
              Lưu {tab === 'highlights' ? 'Điểm Nổi Bật' : 'FAQ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
