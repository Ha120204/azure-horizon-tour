'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { API_BASE_URL } from '@/lib/http/constants';
import { useLocale } from '@/context/LocaleContext';

type UnsubscribeDetails = {
  email: string;
  isActive: boolean;
};

const content = {
  vi: {
    eyebrow: 'Tùy chọn nhận tin',
    title: 'Hủy đăng ký email',
    description: 'Bạn sẽ không còn nhận các bản tin, câu chuyện du lịch và ưu đãi tiếp thị từ Azure Horizon.',
    loading: 'Đang kiểm tra liên kết...',
    confirm: 'Xác nhận hủy đăng ký',
    processing: 'Đang cập nhật...',
    inactiveTitle: 'Bạn đã hủy đăng ký',
    inactiveDescription: 'Địa chỉ email này hiện không nhận email tiếp thị từ Azure Horizon.',
    successTitle: 'Đã hủy đăng ký thành công',
    successDescription: 'Chúng tôi đã cập nhật lựa chọn nhận tin của bạn.',
    invalidTitle: 'Liên kết không hợp lệ',
    invalidDescription: 'Liên kết hủy đăng ký đã thiếu hoặc không còn hợp lệ.',
    home: 'Quay về trang chủ',
  },
  en: {
    eyebrow: 'Email preferences',
    title: 'Unsubscribe from emails',
    description: 'You will stop receiving marketing newsletters, travel stories, and offers from Azure Horizon.',
    loading: 'Checking your link...',
    confirm: 'Confirm unsubscribe',
    processing: 'Updating...',
    inactiveTitle: 'Already unsubscribed',
    inactiveDescription: 'This email address is not receiving marketing emails from Azure Horizon.',
    successTitle: 'Successfully unsubscribed',
    successDescription: 'We have updated your email preferences.',
    invalidTitle: 'Invalid link',
    invalidDescription: 'This unsubscribe link is missing or no longer valid.',
    home: 'Return home',
  },
} as const;

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { language } = useLocale();
  const copy = content[language === 'vi' ? 'vi' : 'en'];
  const [details, setDetails] = useState<UnsubscribeDetails | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'submitting' | 'success' | 'invalid'>('loading');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/subscriber/unsubscribe?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async response => {
        if (!response.ok) throw new Error('Invalid unsubscribe token');
        const json = await response.json();
        setDetails(json?.data ?? json);
        setState('ready');
      })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setState('invalid');
      });

    return () => controller.abort();
  }, [token]);

  const unsubscribe = async () => {
    setState('submitting');
    try {
      const response = await fetch(`${API_BASE_URL}/subscriber/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: 'EMAIL_LINK' }),
      });
      if (!response.ok) throw new Error('Unable to unsubscribe');
      setDetails(current => current ? { ...current, isActive: false } : current);
      setState('success');
    } catch {
      setState('invalid');
    }
  };

  const alreadyInactive = state === 'ready' && details && !details.isActive;
  const title = state === 'success'
    ? copy.successTitle
    : alreadyInactive
      ? copy.inactiveTitle
      : state === 'invalid'
        ? copy.invalidTitle
        : copy.title;
  const description = state === 'success'
    ? copy.successDescription
    : alreadyInactive
      ? copy.inactiveDescription
      : state === 'invalid'
        ? copy.invalidDescription
        : copy.description;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header />
      <main className="mx-auto flex min-h-[78vh] max-w-3xl items-center px-4 pb-20 pt-32">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 md:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <span className="material-symbols-outlined text-3xl">
              {state === 'success' || alreadyInactive ? 'mark_email_read' : state === 'invalid' ? 'link_off' : 'unsubscribe'}
            </span>
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">{description}</p>

          {state === 'loading' && <p className="mt-8 text-sm font-bold text-slate-500">{copy.loading}</p>}

          {details?.email && state !== 'invalid' && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-800">{details.email}</p>
            </div>
          )}

          {state === 'ready' && details?.isActive && (
            <button
              type="button"
              onClick={unsubscribe}
              className="mt-8 h-12 rounded-xl bg-rose-600 px-6 text-sm font-extrabold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              {copy.confirm}
            </button>
          )}

          {state === 'submitting' && <p className="mt-8 text-sm font-bold text-slate-500">{copy.processing}</p>}

          {(state === 'success' || alreadyInactive || state === 'invalid') && (
            <Link
              href="/"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-extrabold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {copy.home}
            </Link>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
