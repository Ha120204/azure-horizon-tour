'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/constants';
import { getSafeRedirectPath } from '@/lib/authRedirect';
import { toastEmitter } from '@/lib/toastEmitter';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State để ẩn/hiện mật khẩu (mặc định là ẩn)
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
    const redirectTarget = getSafeRedirectPath(searchParams.get('redirect'));
    const loginHref = redirectTarget
        ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
        : '/login';

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
            setError('Mật khẩu ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName }),
            });

            if (res.ok) {
                toastEmitter.success(t('auth.regSuccess'), t('auth.regSuccessMessage'));
                router.push(loginHref);
            } else {
                const errData = await res.json();
                setError(errData.message || t('auth.regFailed'));
            }
        } catch {
            setError(t('auth.serverError'));
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleGoogleRegister = () => {
        if (isGoogleLoading) return;
        setIsGoogleLoading(true);
        window.location.href = `${API_BASE_URL}/auth/google`;
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

                    {/* Google Sign-Up Button */}
                    <button
                        id="btn-google-register"
                        type="button"
                        onClick={handleGoogleRegister}
                        disabled={isGoogleLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low border border-outline-variant/30 rounded-full font-medium text-on-surface hover:bg-surface-container hover:border-outline-variant/60 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait mb-6"
                    >
                        {isGoogleLoading ? (
                            <span className="material-symbols-outlined text-[20px] animate-spin text-outline">progress_activity</span>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        )}
                        <span>Đăng ký với Google</span>
                    </button>

                    {/* Divider */}
                    <div className="mb-6 flex items-center gap-3">
                        <hr className="flex-1 border-outline-variant/20" />
                        <span className="text-xs text-on-surface-variant/60 font-medium uppercase tracking-wider">hoặc điền form</span>
                        <hr className="flex-1 border-outline-variant/20" />
                    </div>
                    <form className="space-y-6" onSubmit={handleRegister}>
                        {/* HIỂN THỊ LỖI */}
                        {error && (
                            <div className="p-4 bg-error-container/50 text-error rounded-xl text-sm border border-error/20 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[20px]">error</span>
                                <span>{error}</span>
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

                                {/* Password requirements */}
                                <div className="mt-2.5 p-3 bg-surface-container-low/40 border border-outline-variant/10 rounded-xl">
                                    <p className="text-[11px] font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">info</span>
                                        Yêu cầu mật khẩu:
                                    </p>
                                    <ul className="text-[11px] text-on-surface-variant/80 space-y-0.5 pl-1">
                                        <li className={`flex items-center gap-1.5 transition-colors ${password.length >= 8 ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 8 ký tự
                                        </li>
                                        <li className={`flex items-center gap-1.5 transition-colors ${/[A-Z]/.test(password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 chữ in hoa (A-Z)
                                        </li>
                                        <li className={`flex items-center gap-1.5 transition-colors ${/[a-z]/.test(password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/[a-z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 chữ in thường (a-z)
                                        </li>
                                        <li className={`flex items-center gap-1.5 transition-colors ${/\d/.test(password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/\d/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 chữ số (0-9)
                                        </li>
                                        <li className={`flex items-center gap-1.5 transition-colors ${/[@$!%*?&]/.test(password) ? 'text-emerald-600' : ''}`}>
                                            <span className="material-symbols-outlined text-[12px]">{/[@$!%*?&]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            Ít nhất 1 ký tự đặc biệt (@$!%*?&)
                                        </li>
                                    </ul>
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

                        <button
                            className="w-full hero-gradient text-on-primary py-4 rounded-full font-headline font-semibold text-lg hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
                            <span className={`material-symbols-outlined ${isSubmitting ? 'animate-spin' : ''}`}>
                                {isSubmitting ? 'progress_activity' : 'arrow_forward'}
                            </span>
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                        <p className="text-on-surface-variant text-sm">
                            {t('auth.alreadyHaveAccount')}
                            <Link href={loginHref} className="text-primary font-semibold hover:underline ml-1 transition-all">{t('auth.logIn')}</Link>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
