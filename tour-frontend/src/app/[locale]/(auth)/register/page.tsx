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
import AuthRegisterShell from '@/components/auth/AuthRegisterShell';
import authStyles from '@/components/auth/AuthTheme.module.css';
import { useLocale } from '@/context/LocaleContext';
import { API_BASE_URL } from '@/lib/http/constants';
import { getSafeRedirectPath } from '@/lib/auth/authRedirect';
import { toastEmitter } from '@/lib/http/toastEmitter';

const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [error, setError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
    const redirectTarget = getSafeRedirectPath(searchParams.get('redirect'));
    const loginHref = redirectTarget
        ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
        : '/login';

    const passwordRequirements = [
        { label: t('auth.pwdReqLength'), met: password.length >= 8 },
        { label: t('auth.pwdReqUppercase'), met: /[A-Z]/.test(password) },
        { label: t('auth.pwdReqLowercase'), met: /[a-z]/.test(password) },
        { label: t('auth.pwdReqNumber'), met: /\d/.test(password) },
        { label: t('auth.pwdReqSpecial'), met: /[@$!%*?&]/.test(password) },
    ];
    const showPasswordGuide = password.length > 0;
    const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;

    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const validateEmail = (value: string) => {
        if (value && !EMAIL_PATTERN.test(value)) {
            setEmailError(t('auth.emailInvalid'));
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setError('');

        if (!fullName.trim()) {
            setError(t('auth.fullNameRequired'));
            return;
        }

        if (!validateEmail(email)) return;

        if (!STRONG_PASSWORD_PATTERN.test(password)) {
            setError(t('auth.passwordWeakError'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        if (!agreedToTerms) {
            setError(t('auth.agreeRequired'));
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName: fullName.trim() }),
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
        if (isGoogleLoading || isSubmitting) return;
        setIsGoogleLoading(true);
        const googleUrl = redirectTarget
            ? `${API_BASE_URL}/auth/google?from=${encodeURIComponent(redirectTarget)}`
            : `${API_BASE_URL}/auth/google`;
        window.location.href = googleUrl;
    };

    return (
        <AuthRegisterShell>
            <div className={`${authStyles.formPanel} px-6 py-8 sm:px-10 sm:py-10`}>
                <div className="mb-8">
                    <h1 className="font-headline text-[2.25rem] font-extrabold leading-tight tracking-tight text-[var(--auth-ink)]">
                        {t('auth.registerTitle')}
                    </h1>
                    <p className="mt-2 text-base font-medium text-[var(--auth-muted)]">
                        {t('auth.registerSubtitle')}
                    </p>
                </div>

                <AuthGoogleButton
                    id="btn-google-register"
                    label={t('auth.googleRegisterBtn')}
                    isLoading={isGoogleLoading}
                    disabled={isSubmitting}
                    onClick={handleGoogleRegister}
                />

                <p className="mt-3 text-center text-xs leading-relaxed text-[var(--auth-muted)]">
                    {t('auth.googleConsent')}
                </p>

                <div className="my-6 flex items-center gap-3">
                    <hr className="flex-1 border-[var(--auth-input-border)]" />
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--auth-muted)]">{t('auth.orFillForm')}</span>
                    <hr className="flex-1 border-[var(--auth-input-border)]" />
                </div>

                <form className="space-y-5" onSubmit={handleRegister} noValidate>
                    {error && <AuthErrorMessage icon>{error}</AuthErrorMessage>}

                    <AuthTextField
                        id="register-full-name"
                        label={t('auth.fullNameLbl')}
                        icon="person"
                        required
                        placeholder={t('auth.fullNamePlace')}
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isSubmitting}
                    />

                    <AuthTextField
                        id="register-email"
                        label={t('auth.emailAddressLbl')}
                        icon="mail"
                        required
                        placeholder={t('auth.emailPlace')}
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                        onBlur={(e) => validateEmail(e.target.value)}
                        disabled={isSubmitting}
                        error={!!emailError}
                        helperText={emailError ? (
                            <p className="flex items-center gap-1 text-xs font-semibold text-[var(--auth-danger)]">
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                                {emailError}
                            </p>
                        ) : null}
                    />

                    <AuthPasswordField
                        id="register-password"
                        label={t('auth.passwordLbl')}
                        required
                        placeholder={t('auth.enterPassword')}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        isVisible={showPassword}
                        onToggleVisible={() => setShowPassword((visible) => !visible)}
                        showLabel={t('auth.showPassword')}
                        hideLabel={t('auth.hidePassword')}
                        helperText={
                            showPasswordGuide ? (
                                <div className={`${authStyles.inlineReveal} rounded-[var(--auth-radius-sm)] border border-[var(--auth-input-border)] bg-[var(--auth-surface)] p-3`}>
                                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--auth-muted)]">
                                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">info</span>
                                        {t('auth.passwordRequirementsTitle')}
                                    </p>
                                    <ul className="grid gap-1 text-xs font-medium text-[var(--auth-muted)] sm:grid-cols-2">
                                        {passwordRequirements.map((item) => (
                                            <li key={item.label} className={item.met ? 'flex items-center gap-1.5 text-[var(--auth-success)]' : 'flex items-center gap-1.5'}>
                                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                                                    {item.met ? 'check_circle' : 'radio_button_unchecked'}
                                                </span>
                                                {item.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null
                        }
                    />

                    <AuthPasswordField
                        id="register-confirm-password"
                        label={t('auth.confirmPasswordLbl')}
                        icon="lock_reset"
                        required
                        placeholder={t('auth.confirmPasswordPlace')}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        isVisible={showConfirmPassword}
                        onToggleVisible={() => setShowConfirmPassword((visible) => !visible)}
                        showLabel={t('auth.showPasswordConfirm')}
                        hideLabel={t('auth.hidePasswordConfirm')}
                        error={passwordsMismatch}
                        helperText={
                            passwordsMismatch ? (
                                <p className={`${authStyles.inlineReveal} flex items-center gap-1 text-xs font-semibold text-[var(--auth-danger)]`}>
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                                    {t('auth.passwordsNotMatch')}
                                </p>
                            ) : null
                        }
                    />

                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            disabled={isSubmitting}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary cursor-pointer"
                        />
                        <span className="text-xs leading-relaxed text-[var(--auth-muted)]">
                            {t('auth.agreeIntro')}{' '}
                            <Link href="/terms" target="_blank" className={`${authStyles.linkText} hover:underline`}>{t('auth.termsLink')}</Link>
                            {' '}{t('auth.agreeConnector')}{' '}
                            <Link href="/privacy" target="_blank" className={`${authStyles.linkText} hover:underline`}>{t('auth.privacyLink')}</Link>.
                        </span>
                    </label>

                    <AuthSubmitButton
                        isLoading={isSubmitting}
                        loadingLabel={t('auth.creatingAccount')}
                        idleLabel={t('auth.createAccountBtn')}
                    />
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm font-medium text-[var(--auth-muted)]">
                        {t('auth.alreadyHaveAccount')}
                        <Link href={loginHref} className={`${authStyles.linkText} ml-1 hover:underline`}>
                            {t('auth.logIn')}
                        </Link>
                    </p>
                </div>
            </div>
        </AuthRegisterShell>
    );
}
