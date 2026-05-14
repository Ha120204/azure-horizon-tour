'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/app/context/LocaleContext';
import { API_BASE_URL } from '@/app/lib/constants';

export default function Footer() {
    const { t, language } = useLocale();
    const [email, setEmail] = useState('');
    const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');

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
        } catch (error) {
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
                            Azure Horizon<span className="text-primary">.</span>
                        </span>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 pr-4">
                            {language === 'vi'
                                ? 'Tiên phong thiết kế lại các chuyến đi cao cấp. Chúng tôi tin rằng mỗi lịch trình đều nên mang đậm bản sắc địa phương và để lại dấu ấn cá nhân.'
                                : 'Pioneering premium travel experiences. We believe every journey should be uniquely personalized and deeply rooted in local culture.'}
                        </p>
                        <div className="space-y-3 text-sm text-slate-400">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                                <p>123 Horizon Avenue, District 1, Ho Chi Minh City</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                                <p>+84 1900 1234 (24/7 Concierge)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-primary">mail</span>
                                <p>hello@azurehorizon.com</p>
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
                                <Link className="hover:text-primary transition-colors inline-block" href="/support/track">
                                    {language === 'vi' ? 'Trung tâm hỗ trợ' : 'Help Center'}
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
                        <p className="text-xs text-slate-500">{t('footer.copyright')}</p>
                        <div className="hidden md:flex gap-4 items-center h-5">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-full opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white/10 px-1 py-0.5 rounded" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" alt="Mastercard" className="h-full opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white/10 px-1 py-0.5 rounded" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-full opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white/10 px-1.5 py-0.5 rounded" />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <a aria-label="Facebook" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 transition-all" href="#" target="_blank" rel="noreferrer">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        </a>
                        <a aria-label="Instagram" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-pink-500 hover:bg-pink-500/10 transition-all" href="#" target="_blank" rel="noreferrer">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.7-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        </a>
                        <a aria-label="X/Twitter" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-blue-400 hover:bg-blue-400/10 transition-all" href="#" target="_blank" rel="noreferrer">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.938 4.938 0 002.163-2.723 9.878 9.878 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
