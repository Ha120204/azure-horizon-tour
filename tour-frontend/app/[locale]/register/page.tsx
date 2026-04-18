'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useLocale } from '@/app/context/LocaleContext';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State để ẩn/hiện mật khẩu (mặc định là ẩn)
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();
    const { t } = useLocale();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        try {
            const res = await fetch('http://localhost:3000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName }),
            });

            if (res.ok) {
                setTimeout(() => router.push('/login'), 500);
            } else {
                const errData = await res.json();
                setError(errData.message || t('auth.regFailed'));
            }
        } catch (err) {
            setError(t('auth.serverError'));
        }
    };

    return (
        <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
            <Header />
            <main className="flex-grow flex items-center justify-center px-6 py-12 mt-16 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/5 blur-[120px] pointer-events-none"></div>

                {/* Registration Card */}
                <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-lg ambient-glow p-8 md:p-12 z-10 border border-outline-variant/10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container mb-6">
                            <span className="material-symbols-outlined text-primary text-3xl">explore</span>
                        </div>
                        <h1 className="text-[2rem] font-bold tracking-tight text-on-surface mb-2 font-headline">{t('auth.registerTitle')}</h1>
                        <p className="text-on-surface-variant text-body-md leading-relaxed">{t('auth.registerSubtitle')}</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleRegister}>
                        {/* HIỂN THỊ LỖI */}
                        {error && (
                            <div className="p-4 bg-error-container/50 text-error rounded-xl text-sm border border-error/20 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[20px]">error</span>
                                <span>{error}</span>
                            </div>
                        )}
                        {/* HIỂN THỊ THÀNH CÔNG */}
                        {success && (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3 shadow-sm">
                                <span className="material-symbols-outlined text-emerald-600 text-[20px]">task_alt</span>
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-800 font-headline">{t('auth.regSuccess')}</h4>
                                    <p className="text-xs text-emerald-600 mt-1">{success}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-[11px] font-semibold tracking-wider uppercase text-on-surface-variant px-1">{t('auth.fullNameLbl')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] -mt-[2px]">person</span>
                                <input
                                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60 text-sm"
                                    placeholder={t('auth.fullNamePlace')}
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-semibold tracking-wider uppercase text-on-surface-variant px-1">{t('auth.emailAddressLbl')}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] -mt-[2px]">mail</span>
                                <input
                                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60 text-sm"
                                    placeholder={t('auth.emailPlace')}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mt-4">

                            {/* Ô NHẬP MẬT KHẨU*/}
                            <div className="space-y-2 w-full">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('auth.passwordLbl')}</label>

                                <div className="flex items-center bg-slate-50/50 rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all border border-slate-100">
                                    <span className="material-symbols-outlined text-slate-400 mr-2 flex-shrink-0">lock</span>

                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="flex-1 bg-transparent border-none outline-none py-3 text-sm min-w-0 text-slate-700"
                                        placeholder={t('auth.enterPassword')}
                                        value={password} onChange={(e) => setPassword(e.target.value)} // Bật lại biến của em
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-slate-400 hover:text-primary ml-2 flex-shrink-0 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showPassword ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Ô XÁC NHẬN MẬT KHẨU */}
                            <div className="space-y-2 w-full">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">{t('auth.confirmPasswordLbl')}</label>

                                <div className={`flex items-center rounded-lg px-3 focus-within:ring-1 transition-all border ${confirmPassword && confirmPassword !== password ? 'border-error/50 focus-within:ring-error bg-error/5 focus-within:bg-error/10' : 'border-slate-100 bg-slate-50/50 focus-within:ring-primary focus-within:bg-white'}`}>
                                    <span className={`material-symbols-outlined mr-2 flex-shrink-0 ${confirmPassword && confirmPassword !== password ? 'text-error' : 'text-slate-400'}`}>lock_reset</span>

                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className={`flex-1 bg-transparent border-none outline-none py-3 text-sm min-w-0 ${confirmPassword && confirmPassword !== password ? 'text-error' : 'text-slate-700'}`}
                                        placeholder={t('auth.confirmPasswordPlace')}
                                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className={`ml-2 flex-shrink-0 transition-colors ${confirmPassword && confirmPassword !== password ? 'text-error/70 hover:text-error' : 'text-slate-400 hover:text-primary'}`}
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showConfirmPassword ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword !== password && (
                                    <p className="text-error text-xs flex items-center gap-1 mt-1">
                                        <span className="material-symbols-outlined text-[14px]">error</span>
                                        {t('auth.passwordsNotMatch')}
                                    </p>
                                )}
                            </div>

                        </div>

                        <button className="w-full hero-gradient text-on-primary py-4 rounded-full font-headline font-semibold text-lg hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4" type="submit">
                            {t('auth.createAccountBtn')}
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                        <p className="text-on-surface-variant text-sm">
                            {t('auth.alreadyHaveAccount')}
                            <Link href="/login" className="text-primary font-semibold hover:underline ml-1 transition-all">{t('auth.logIn')}</Link>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}