'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';

export default function Footer() {
    const { t, language } = useLocale();
    const [email, setEmail] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);

    useEffect(() => {
        const controller = new AbortController();
        fetchPublicSettings(controller.signal)
            .then(setPublicSettings)
            .catch(error => {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('Error loading public settings:', error);
                }
            });

        return () => controller.abort();
    }, []);

    const companyDescription = language === 'vi'
        ? (publicSettings.company_description || 'Tiên phong thiết kế lại các chuyến đi cao cấp. Chúng tôi tin rằng mỗi lịch trình đều nên mang đậm bản sắc địa phương và để lại dấu ấn cá nhân.')
        : 'Premium journeys, thoughtfully planned with local character and personal detail.';
    const companyAddress = language === 'vi'
        ? publicSettings.company_address
        : '175 Tay Son Street, Kim Lien, Hanoi';

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus('idle'), 3000);
            return;
        }
        setSubscribeStatus('loading');
        try {
            const res = await fetch(`${API_BASE_URL}/subscriber/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.message === 'already_exists') {
                    setSubscribeStatus('exists');
                } else {
                    setSubscribeStatus('success');
                    setEmail('');
                }
            } else {
                setSubscribeStatus('error');
            }
        } catch {
            setSubscribeStatus('error');
        } finally {
            setTimeout(() => setSubscribeStatus('idle'), 4000);
        }
    };

    return (
        <footer className="bg-slate-950 text-slate-300 pt-20 pb-12 px-8 mt-auto border-t-[4px] border-primary">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-12 gap-12 mb-16">

                    {/* Cột 1: Thương hiệu & Liên hệ (4 cột) */}
                    <div className="md:col-span-4">
                        <span className="text-3xl font-headline font-black tracking-tight mb-6 block text-white">
                            {publicSettings.company_name}<span className="text-primary">.</span>
                        </span>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 pr-4">
                            {companyDescription}
                        </p>
                        <div className="space-y-3 text-sm text-slate-400">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                                <p>{companyAddress}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                                <p>{publicSettings.company_phone} (24/7 Concierge)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-primary">mail</span>
                                <p>{publicSettings.company_email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cột 2: Khám phá (2 cột, bắt đầu từ cột 6) */}
                    <div className="md:col-span-2 md:col-start-6">
                        <h4 className="text-white font-headline font-bold mb-6 tracking-wide uppercase text-sm">
                            {language === 'vi' ? 'Khám phá' : 'Discover'}
                        </h4>
                        <ul className="space-y-4 text-sm text-slate-400 font-medium">
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/destinations">
                                    {t('footer.destinations')}
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/promotions">
                                    {language === 'vi' ? 'Ưu đãi & Khuyến mãi' : 'Deals & Promotions'}
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/journal">
                                    {language === 'vi' ? 'Cẩm nang du lịch' : 'Travel Journal'}
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/about">
                                    {language === 'vi' ? 'Về chúng tôi' : 'About Us'}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Cột 3: Hỗ trợ (2 cột) */}
                    <div className="md:col-span-2">
                        <h4 className="text-white font-headline font-bold mb-6 tracking-wide uppercase text-sm">
                            {language === 'vi' ? 'Hỗ trợ' : 'Support'}
                        </h4>
                        <ul className="space-y-4 text-sm text-slate-400 font-medium">
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/contact">
                                    {language === 'vi' ? 'Liên hệ' : 'Contact Us'}
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/my-bookings">
                                    {language === 'vi' ? 'Đặt tour của tôi' : 'My Bookings'}
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-primary transition-colors inline-block" href="/profile">
                                    {language === 'vi' ? 'Tài khoản' : 'My Account'}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Cột 4: Newsletter (4 cột) */}
                    <div className="md:col-span-4">
                        <h4 className="text-white font-headline font-bold mb-6 tracking-wide uppercase text-sm">
                            {language === 'vi' ? 'Đăng ký nhận tin' : 'Newsletter'}
                        </h4>
                        <p className="text-sm text-slate-400 mb-6 w-5/6">
                            {language === 'vi'
                                ? 'Đừng bỏ lỡ các deal shock và gợi ý hành trình độc đáo gửi thẳng vào hộp thư mỗi cuối tuần.'
                                : 'Get exclusive travel deals and cultural insights straight to your inbox each weekend.'}
                        </p>

                        <form onSubmit={handleSubscribe} className="relative flex flex-col gap-2">
                            <div className="flex">
                                <input
                                    className="bg-slate-900 border border-slate-800 rounded-l-xl px-4 py-3.5 w-full text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all disabled:opacity-50"
                                    placeholder={t('footer.emailPlaceholder')}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={subscribeStatus === 'loading'}
                                />
                                <button
                                    type="submit"
                                    disabled={subscribeStatus === 'loading'}
                                    className="bg-primary px-5 py-3.5 rounded-r-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                                >
                                    {subscribeStatus === 'loading'
                                        ? <span className="material-symbols-outlined text-[18px] text-on-primary animate-spin">progress_activity</span>
                                        : <span className="material-symbols-outlined text-[18px] text-on-primary">send</span>
                                    }
                                </button>
                            </div>
                            {subscribeStatus === 'success' && (
                                <p className="text-emerald-400 text-xs font-semibold mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    {language === 'vi' ? 'Gia nhập thành công!' : 'Success!'}
                                </p>
                            )}
                            {subscribeStatus === 'exists' && (
                                <p className="text-blue-400 text-xs font-semibold mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    {language === 'vi' ? 'Bạn đã đăng ký trước đó rồi!' : 'Email already exists!'}
                                </p>
                            )}
                            {subscribeStatus === 'error' && (
                                <p className="text-red-400 text-xs font-semibold mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                    {language === 'vi' ? 'Có lỗi hoặc sai email!' : 'Error processing request!'}
                                </p>
                            )}
                        </form>
                    </div>
                </div>

                {/* Bottom bar: Copyright, Payment, Social */}
                <div className="pt-8 mt-4 border-t border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <p className="text-xs text-slate-500">© 2026 {publicSettings.company_name}. All rights reserved.</p>
                        <div className="hidden md:flex gap-3 items-center" aria-label="Accepted payment methods">
                            {['VISA', 'Mastercard', 'PayPal'].map(method => (
                                <span
                                    key={method}
                                    className="rounded bg-white/10 px-2 py-1 text-[10px] font-black tracking-wide text-slate-500 transition-colors hover:text-slate-200"
                                >
                                    {method}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <a aria-label="Facebook" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 transition-all" href="https://www.facebook.com/daothanhha120204" target="_blank" rel="noreferrer">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        </a>
                        <a aria-label="Instagram" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-pink-500 hover:bg-pink-500/10 transition-all" href="https://www.instagram.com/dao_thanhha/" target="_blank" rel="noreferrer">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.7-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        </a>
                        <a aria-label="Zalo" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-sky-500 hover:bg-sky-500/10 transition-all" href="https://zalo.me/0386761856" target="_blank" rel="noreferrer">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" aria-hidden="true">
                                <path
                                    fill="currentColor"
                                    d="M16 3C8.82 3 3 8.02 3 14.2c0 3.54 1.94 6.7 4.96 8.75L7.1 28.1a.7.7 0 0 0 .98.73l5.36-2.58c.82.14 1.67.21 2.56.21 7.18 0 13-5.02 13-11.2S23.18 3 16 3Z"
                                />
                                <path
                                    fill="#020617"
                                    d="M9.24 18.95h5.05v-1.52h-2.86l2.75-4.21v-1.17H9.5v1.52h2.49l-2.75 4.21v1.17Zm7.63.08c1.01 0 1.67-.42 2.04-1.03v.95h1.64v-4.63h-1.64v.82c-.36-.55-1.01-.93-1.94-.93-1.37 0-2.39 1.04-2.39 2.42 0 1.39 1 2.4 2.29 2.4Zm.44-1.45c-.6 0-1.07-.4-1.07-.98 0-.57.47-.97 1.07-.97.59 0 1.07.4 1.07.97 0 .58-.48.98-1.07.98Zm4.02 1.37h1.65v-6.9h-1.65v6.9Z"
                                />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
