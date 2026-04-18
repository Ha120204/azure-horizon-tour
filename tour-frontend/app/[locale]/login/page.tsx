'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const router = useRouter();
    const { t } = useLocale();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const payload = await res.json();
                const data = payload.data || payload;
                localStorage.setItem('accessToken', data.access_token);
                // refreshToken is now handled via HttpOnly cookie by the browser
                localStorage.setItem('userName', data.user?.fullName || '');

                // Phát sự kiện để Header tự cập nhật chữ Đăng nhập thành Avatar
                window.dispatchEvent(new Event('auth-change'));

                // Chuyển trang mượt mà qua Next Router (0ms delay)
                router.push('/');

            } else {
                const errData = await res.json();
                setError(errData.message || t('auth.invalidCred'));
            }
        } catch (err) {
            setError(t('auth.serverError'));
        }
    };

    return (
        <>
            <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body relative">
                {successMsg && (
                    <div className="fixed top-24 right-8 z-[100] animate-bounce">
                        <div className="bg-white border-l-4 border-emerald-500 shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <span className="material-symbols-outlined text-2xl">check_circle</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 font-headline">{t('auth.success')}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{successMsg}</p>
                            </div>
                        </div>
                    </div>
                )}
                <Header />

                <main className="flex-grow flex items-center justify-center p-6 mt-16 relative overflow-hidden">
                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-container rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-secondary-fixed rounded-full blur-3xl opacity-30"></div>
                    </div>
                    <div className="w-full max-w-md relative z-10">
                        <div className="bg-surface-container-lowest rounded-xl editorial-shadow p-8 md:p-10 border border-outline-variant/10">
                            <div className="mb-10 text-center">
                                <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">{t('auth.loginTitle')}</h1>
                                <p className="text-on-surface-variant body-md">{t('auth.loginSubtitle')}</p>
                            </div>

                            <form className="space-y-6" onSubmit={handleLogin}>
                                {error && (
                                    <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium border border-error/20">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="block font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-semibold ml-1">{t('auth.emailLbl')}</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                                        <input
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-transparent rounded-lg focus:ring-0 focus:border-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 border border-transparent"
                                            placeholder={t('auth.emailPlace')}
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-semibold ml-1">{t('auth.passwordLbl')}</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                                        <input
                                            required
                                            className="w-full pl-12 pr-12 py-3 bg-surface-container-low border-transparent rounded-lg focus:ring-0 focus:border-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 border border-transparent"
                                            placeholder={t('auth.passwordPlace')}
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" type="button" onClick={() => setShowPassword(!showPassword)}>
                                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    <div className="flex justify-end">
                                        <Link href="/forgot-password" className="font-label text-[0.6875rem] uppercase tracking-wider text-primary font-bold hover:underline">{t('auth.forgotPassword')}</Link>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-headline font-bold text-base tracking-wide editorial-shadow active:scale-[0.98] transition-all" type="submit">
                                    {t('auth.signInBtn')}
                                </button>
                            </form>

                            <div className="mt-10 pt-8 border-t border-outline-variant/15 text-center">
                                <p className="text-sm text-on-surface-variant font-medium">
                                    {t('auth.noAccount')}
                                    <Link
                                        href="/register"
                                        className="text-primary font-bold hover:underline ml-1 cursor-pointer"
                                    >
                                        {t('auth.createAccount')}
                                    </Link>
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-center gap-6">
                            <a className="text-on-surface-variant/60 hover:text-primary transition-colors" href="#">
                                <span className="sr-only">Help</span>
                                <span className="material-symbols-outlined text-lg">help_outline</span>
                            </a>
                            <a className="text-on-surface-variant/60 hover:text-primary transition-colors" href="#">
                                <span className="sr-only">Security</span>
                                <span className="material-symbols-outlined text-lg">verified_user</span>
                            </a>
                            <a className="text-on-surface-variant/60 hover:text-primary transition-colors" href="#">
                                <span className="sr-only">Privacy</span>
                                <span className="material-symbols-outlined text-lg">lock_person</span>
                            </a>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </>
    );
}