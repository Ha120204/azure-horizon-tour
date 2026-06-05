'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SupportTicketDetail from '@/components/profile/SupportTicketDetail';
import { API_BASE_URL } from '@/lib/constants';
import type { SupportTicket } from '@/components/profile/SupportTicketList';

type TicketResponse = SupportTicket | { data?: SupportTicket; message?: string };

function isSupportTicket(payload: unknown): payload is SupportTicket {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'subject' in payload &&
    'status' in payload
  );
}

function resolveTicket(payload: TicketResponse): SupportTicket | undefined {
  if (isSupportTicket(payload)) return payload;
  return payload.data;
}

function resolveMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || !('message' in payload)) return undefined;
  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

export default function GuestSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessCodeFromUrl = searchParams.get('accessCode') ?? '';
  const [accessCode, setAccessCode] = useState(accessCodeFromUrl);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(accessCodeFromUrl));

  useEffect(() => {
    if (!accessCodeFromUrl) return;
    void fetchTicket(accessCodeFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessCodeFromUrl, params.id]);

  const fetchTicket = async (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Vui lòng nhập mã truy cập.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/support/customer/ticket/${params.id}?accessCode=${encodeURIComponent(trimmedCode)}`);
      const payload = (await res.json()) as TicketResponse;

      if (!res.ok) {
        setError(resolveMessage(payload) ?? 'Không thể tải yêu cầu hỗ trợ.');
        setTicket(null);
        return;
      }

      const resolvedTicket = resolveTicket(payload);
      if (!resolvedTicket) {
        setError('Không tìm thấy yêu cầu hỗ trợ.');
        setTicket(null);
        return;
      }

      setTicket(resolvedTicket);
      setAccessCode(trimmedCode);
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại.');
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void fetchTicket(accessCode);
  };

  if (ticket) {
    return (
      <SupportTicketDetail
        ticket={ticket}
        lookupAccessCode={accessCode}
        onClose={() => router.push('/contact')}
        onTicketUpdate={setTicket}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Header />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 pb-20 pt-32">
        <div className="rounded-3xl border border-outline-variant/20 bg-white p-8 shadow-xl">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-3xl">support_agent</span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">
            Theo dõi yêu cầu hỗ trợ
          </h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Nhập mã truy cập trong email xác nhận để xem trao đổi với đội ngũ hỗ trợ.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="support-access-code" className="text-xs font-bold uppercase tracking-widest text-primary">
                Mã truy cập
              </label>
              <input
                id="support-access-code"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-outline-variant/40 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-primary"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>

            {error && <p className="text-sm font-medium text-error">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-headline text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Xem yêu cầu
            </button>
          </form>

          <Link href="/contact" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">
            Quay lại trang liên hệ
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
