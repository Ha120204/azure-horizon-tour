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
import { clearClientUserStorage } from '@/lib/authSession';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
    const redirectTarget = getSafeRedirectPath(searchParams.get('redirect'));
    const registerHref = redirectTarget
        ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
        : '/register';

    // Hiển thị lỗi từ Google OAuth callback (nếu có)
    const oauthError = searchParams.get('error');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');
        setIsSubmitting(true);
        let keepLoading = false;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const payload = await res.json();
                const data = payload.data || payload;
                clearClientUserStorage();
                localStorage.setItem('userName', data.user?.fullName || '');
                if (data.user?.avatarUrl) {
                    localStorage.setItem('userAvatar', data.user.avatarUrl);
                } else {
                    localStorage.removeItem('userAvatar');
                }

                // Phát sự kiện để Header tự cập nhật chữ Đăng nhập thành Avatar
                window.dispatchEvent(new Event('auth-change'));

                // Chuyển trang mượt mà qua Next Router (0ms delay)
                keepLoading = true;
                if (redirectTarget) {
                    window.location.assign(redirectTarget);
                } else {
                    router.push('/');
                }

            } else {
                const errData = await res.json();
                setError(errData.message || t('auth.invalidCred'));
            }
        } catch {
            setError(t('auth.serverError'));
        } finally {
            if (!keepLoading) {
                setIsSubmitting(false);
            }
        }
    };

    const handleGoogleLogin = () => {
        if (isGoogleLoading || isSubmitting) return;
        setIsGoogleLoading(true);
        // Redirect trình duyệt đến backend — Passport xử lý phần còn lại
        window.location.href = `${API_BASE_URL}/auth/google`;
    };

    return (
        <>
            <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body relative">
                <Header />

                <main className="flex-grow flex items-center justify-center p-6 mt-16 relative overflow-hidden">
                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-container rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-secondary-fixed rounded-full blur-3xl opacity-30"></div>
                    </div>
                    <div className="w-full max-w-md relative z-10">
                        <div className="bg-surface-container-lowest rounded-xl editorial-shadow p-8 md:p-10 border border-outline-variant/10">
                            <div className="mb-8 text-center">
                                <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">{t('auth.loginTitle')}</h1>
                                <p className="text-on-surface-variant body-md">{t('auth.loginSubtitle')}</p>
                            </div>

                            {/* ── Lỗi OAuth ── */}
                            {oauthError && (
                                <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium border border-error/20">
                                    Đăng nhập Google thất bại. Vui lòng thử lại.
                                </div>
                            )}

                            {/* ── Google Sign-In Button ── */}
                            <button
                                id="btn-google-login"
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isGoogleLoading || isSubmitting}
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low border border-outline-variant/30 rounded-full font-medium text-on-surface hover:bg-surface-container hover:border-outline-variant/60 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait"
                            >
                                {isGoogleLoading ? (
                                    <span className="material-symbols-outlined text-[20px] animate-spin text-outline">progress_activity</span>
                                ) : (
                                    /* Google "G" SVG logo */
                                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                )}
                                <span>Tiếp tục với Google</span>
                            </button>

                            {/* ── Divider ── */}
                            <div className="my-6 flex items-center gap-3">
                                <hr className="flex-1 border-outline-variant/20" />
                                <span className="text-xs text-on-surface-variant/60 font-medium uppercase tracking-wider">hoặc</span>
                                <hr className="flex-1 border-outline-variant/20" />
                            </div>

                            {/* ── Form email/password ── */}
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
                                            className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-transparent rounded-lg focus:ring-0 focus:border-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 border border-transparent disabled:cursor-wait disabled:opacity-70"
                                            placeholder={t('auth.emailPlace')}
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-semibold ml-1">{t('auth.passwordLbl')}</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                                        <input
                                            required
                                            className="w-full pl-12 pr-12 py-3 bg-surface-container-low border-transparent rounded-lg focus:ring-0 focus:border-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 border border-transparent disabled:cursor-wait disabled:opacity-70"
                                            placeholder={t('auth.passwordPlace')}
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    <div className="flex justify-end">
                                        <Link href="/forgot-password" className="font-label text-[0.6875rem] uppercase tracking-wider text-primary font-bold hover:underline">{t('auth.forgotPassword')}</Link>
                                    </div>
                                </div>

                                <button
                                    id="btn-email-login"
                                    className="w-full min-h-14 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-headline font-bold text-base tracking-wide editorial-shadow active:scale-[0.98] transition-all disabled:cursor-wait disabled:opacity-75 flex items-center justify-center gap-2.5"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="material-symbols-outlined text-[20px] animate-spin" aria-hidden="true">progress_activity</span>
                                            {t('auth.loggingIn')}
                                        </>
                                    ) : (
                                        t('auth.signInBtn')
                                    )}
                                </button>
                            </form>

                            <div className="mt-10 pt-8 border-t border-outline-variant/15 text-center">
                                <p className="text-sm text-on-surface-variant font-medium">
                                    {t('auth.noAccount')}
                                    <Link
                                        href={registerHref}
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
