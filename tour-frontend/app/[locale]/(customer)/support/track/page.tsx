'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import SupportTicketDetail from '@/app/components/profile/SupportTicketDetail';
import type { SupportTicket } from '@/app/components/profile/SupportTicketList';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function TrackContent() {
  const searchParams = useSearchParams();
  const [ticket, setTicket]       = useState<SupportTicket | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showDetail, setShowDetail] = useState(false);

  // Form state (manual lookup)
  const [email, setEmail]         = useState(searchParams.get('email') ?? '');
  const [ticketId, setTicketId]   = useState(searchParams.get('id') ?? '');

  // Auto-fetch if both params are in URL
  useEffect(() => {
    const id = searchParams.get('id');
    const em = searchParams.get('email');
    if (id && em) {
      fetchTicket(id, em);
    }
  }, []);

  const fetchTicket = async (id: string, em: string) => {
    setLoading(true);
    setError('');
    setTicket(null);
    try {
      const res = await fetch(
        `${API_BASE}/support/customer/ticket/${id}?email=${encodeURIComponent(em)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Không tìm thấy yêu cầu. Vui lòng kiểm tra lại mã và email.');
        return;
      }
      const data = await res.json();
      setTicket(data);
      setShowDetail(true);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim() || !email.trim()) return;
    fetchTicket(ticketId.trim(), email.trim());
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow pt-32 pb-24 px-4 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-10">
          <span className="text-[0.6875rem] font-medium tracking-[0.1em] uppercase text-primary font-label">
            Hỗ trợ khách hàng
          </span>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mt-2 tracking-tight">
            Tra cứu yêu cầu
          </h1>
          <p className="text-on-surface-variant mt-3 leading-relaxed">
            Nhập mã yêu cầu và email bạn đã dùng khi liên hệ để xem tiến trình xử lý.
          </p>
        </div>

        {/* Lookup Form */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="track-ticket-id" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label block">
                Mã yêu cầu <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-mono text-lg">#</span>
                <input
                  id="track-ticket-id"
                  type="number"
                  required
                  placeholder="Ví dụ: 42"
                  value={ticketId}
                  onChange={e => setTicketId(e.target.value)}
                  className="w-full pl-9 pr-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50 font-mono"
                />
              </div>
              <p className="text-xs text-outline">Mã số này được hiển thị trong email xác nhận Azure Horizon gửi cho bạn</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="track-email" className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase font-label block">
                Email đã dùng khi liên hệ <span className="text-error">*</span>
              </label>
              <input
                id="track-email"
                type="email"
                required
                placeholder="example@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline/50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-xl">
                <span className="material-symbols-outlined text-error text-xl shrink-0">error</span>
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-full font-headline font-bold text-base shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#003f87 0%,#0056b3 100%)' }}
            >
              {loading
                ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>Đang tra cứu…</>
                : <><span className="material-symbols-outlined text-base">search</span>Tra cứu yêu cầu</>
              }
            </button>
          </form>
        </div>

        {/* Tips */}
        <div className="rounded-2xl border border-outline-variant/20 p-6 space-y-4">
          <h2 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
            Hướng dẫn tra cứu
          </h2>
          <ul className="space-y-3">
            {[
              { icon: 'mail', text: 'Kiểm tra hộp thư email của bạn (kể cả thư mục Spam) để tìm email xác nhận từ Azure Horizon' },
              { icon: 'tag', text: 'Mã yêu cầu là số trong email xác nhận, ví dụ: #42' },
              { icon: 'person', text: 'Đăng nhập vào tài khoản để xem tất cả yêu cầu tại trang Hồ sơ' },
              { icon: 'schedule', text: 'Thời gian phản hồi trung bình: 2 giờ trong giờ làm việc (8:00 – 20:00)' },
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">{tip.icon}</span>
                {tip.text}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />

      {/* Ticket Detail Modal */}
      {showDetail && ticket && (
        <SupportTicketDetail
          ticket={ticket}
          lookupEmail={email}
          onClose={() => setShowDetail(false)}
          onTicketUpdate={updated => setTicket(updated)}
        />
      )}
    </div>
  );
}

export default function SupportTrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary">Đang tải...</div>}>
      <TrackContent />
    </Suspense>
  );
}
