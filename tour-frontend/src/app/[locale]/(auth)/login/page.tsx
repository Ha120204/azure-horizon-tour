'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import {
    AuthErrorMessage,
    AuthGoogleButton,
    AuthPasswordField,
    AuthSubmitButton,
    AuthTextField,
} from '@/components/auth/AuthFormControls';
import AuthSplitShell from '@/components/auth/AuthSplitShell';
import authStyles from '@/components/auth/AuthTheme.module.css';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';
import { getSafeRedirectPath } from '@/lib/auth/authRedirect';
import { clearClientUserStorage } from '@/lib/auth/authSession';

const LOGIN_HERO_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85';

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
    const oauthError = searchParams.get('error');

    const handleLogin = async (e: FormEvent) => {
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

                window.dispatchEvent(new Event('auth-change'));

                keepLoading = true;
                if (redirectTarget) {
                    window.location.assign(redirectTarget);
                } else {
                    router.push('/');
                }
            } else {
                if (res.status === 401) {
                    setError(t('auth.invalidCred'));
                } else if (res.status === 429) {
                    setError(t('auth.tooManyLoginAttempts'));
                } else {
                    setError(t('auth.loginFailed'));
                }
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
        window.location.href = `${API_BASE_URL}/auth/google`;
    };

    return (
        <AuthSplitShell
            imageSrc={LOGIN_HERO_IMAGE}
            imageAlt="Vịnh biển xanh trong một hành trình nghỉ dưỡng"
            title="Bảng Điều Khiển Chuyến Đi"
            description="Mở lại hành trình của bạn, kiểm tra booking, thanh toán và các hỗ trợ cần thiết trong một nơi duy nhất."
            metrics={[
                { value: '24/7', label: 'Hỗ trợ' },
                { value: 'SSL', label: 'Bảo mật' },
                { value: '3 bước', label: 'Quản lý' },
            ]}
        >
            <div className={`${authStyles.formPanel} px-6 py-8 sm:px-10 sm:py-10`}>
                <div className="mb-8">
                    <h1 className="font-headline text-[2.25rem] font-extrabold leading-tight tracking-tight text-[var(--auth-ink)]">
                        {t('auth.loginTitle')}
                    </h1>
                    <p className="mt-2 text-base font-medium text-[var(--auth-muted)]">
                        {t('auth.loginSubtitle')}
                    </p>
                </div>

                {oauthError && (
                    <AuthErrorMessage className="mb-4">
                        {t('auth.googleLoginError')}
                    </AuthErrorMessage>
                )}

                <AuthGoogleButton
                    id="btn-google-login"
                    label={t('auth.googleContinueBtn')}
                    isLoading={isGoogleLoading}
                    disabled={isSubmitting}
                    onClick={handleGoogleLogin}
                />

                <div className="my-6 flex items-center gap-3">
                    <hr className="flex-1 border-[var(--auth-input-border)]" />
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--auth-muted)]">{t('auth.orDivider')}</span>
                    <hr className="flex-1 border-[var(--auth-input-border)]" />
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                    {error && <AuthErrorMessage>{error}</AuthErrorMessage>}

                    <AuthTextField
                        id="login-email"
                        label={t('auth.emailLbl')}
                        icon="mail"
                        required
                        placeholder={t('auth.emailPlace')}
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                    />

                    <AuthPasswordField
                        id="login-password"
                        label={t('auth.passwordLbl')}
                        labelAction={
                            <Link href="/forgot-password" className={`${authStyles.linkText} text-sm hover:underline`}>
                                {t('auth.forgotPassword')}
                            </Link>
                        }
                        required
                        placeholder={t('auth.passwordPlace')}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        isVisible={showPassword}
                        onToggleVisible={() => setShowPassword((visible) => !visible)}
                        showLabel={t('auth.showPassword')}
                        hideLabel={t('auth.hidePassword')}
                    />

                    <AuthSubmitButton
                        id="btn-email-login"
                        isLoading={isSubmitting}
                        loadingLabel={t('auth.loggingIn')}
                        idleLabel={t('auth.signInBtn')}
                    />
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm font-medium text-[var(--auth-muted)]">
                        {t('auth.noAccount')}
                        <Link href={registerHref} className={`${authStyles.linkText} ml-1 hover:underline`}>
                            {t('auth.createAccount')}
                        </Link>
                    </p>
                </div>
            </div>
        </AuthSplitShell>
    );
}
