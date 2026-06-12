"use client";
import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { api } from "@/lib/http/fetchWithAuth";
import AuthForgotShell from "@/components/auth/AuthForgotShell";
import authStyles from "@/components/auth/AuthTheme.module.css";
import {
    AuthErrorMessage,
    AuthPasswordField,
    AuthSubmitButton,
    AuthTextField,
} from "@/components/auth/AuthFormControls";

type Step = "email" | "otp" | "newPassword" | "success";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function ForgotPasswordPage() {
    const t = useTranslations("auth");
    const locale = useLocale() as "vi" | "en";

    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [resendToast, setResendToast] = useState<"success" | "error" | null>(null);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    useEffect(() => {
        if (!resendToast) return;
        const timer = setTimeout(() => setResendToast(null), 4000);
        return () => clearTimeout(timer);
    }, [resendToast]);

    const sendOtp = async (targetEmail: string) => {
        const result = await api.post<{ message: string }>(
            "/auth/forgot-password",
            { email: targetEmail, locale },
            { silent: true },
        );
        return result;
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email.trim()) {
            setError(t("emailRequired"));
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailPattern.test(email)) {
            setError(t("emailInvalid"));
            return;
        }
        setIsLoading(true);
        try {
            const result = await sendOtp(email);
            if (!result.ok) { setError(t("accountNotFound")); return; }
            setStep("otp");
            setCountdown(60);
        } catch {
            setError(t("forgotGenericError"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsLoading(true);
        setResendToast(null);
        try {
            const result = await sendOtp(email);
            setResendToast(result.ok ? "success" : "error");
            if (result.ok) setCountdown(60);
        } catch {
            setResendToast("error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...otpDigits];
        next[index] = value.slice(-1);
        setOtpDigits(next);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setOtpDigits(pasted.split(""));
            otpRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (otpDigits.join("").length < 6) {
            setError(t("otpInvalidError"));
            return;
        }
        setIsLoading(true);
        try {
            const result = await api.post<{ message: string }>(
                "/auth/verify-otp",
                { email, otp: otpDigits.join("") },
                { silent: true },
            );
            if (!result.ok) {
                const isExpired = (result.error ?? "").toLowerCase().includes("expired");
                setError(isExpired ? t("otpExpiredError") : t("otpInvalidError"));
                return;
            }
            setStep("newPassword");
        } catch {
            setError(t("forgotGenericError"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!PASSWORD_REGEX.test(newPassword)) {
            setError(t("passwordWeakError"));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t("passwordMismatch"));
            return;
        }
        setIsLoading(true);
        try {
            const result = await api.post<{ message: string }>(
                "/auth/reset-password",
                { email, otp: otpDigits.join(""), newPassword },
                { silent: true },
            );
            if (!result.ok) {
                const isExpired = (result.error ?? "").toLowerCase().includes("expired");
                setError(isExpired ? t("otpExpiredError") : t("otpInvalidError"));
                // OTP hết hạn hoặc sai → quay về bước OTP
                setStep("otp");
                setOtpDigits(["", "", "", "", "", ""]);
                return;
            }
            setStep("success");
        } catch {
            setError(t("forgotGenericError"));
        } finally {
            setIsLoading(false);
        }
    };

    const passwordRequirements = [
        { label: t("pwdReqLength"), met: newPassword.length >= 8 },
        { label: t("pwdReqUppercase"), met: /[A-Z]/.test(newPassword) },
        { label: t("pwdReqLowercase"), met: /[a-z]/.test(newPassword) },
        { label: t("pwdReqNumber"), met: /\d/.test(newPassword) },
        { label: t("pwdReqSpecial"), met: /[@$!%*?&]/.test(newPassword) },
    ];

    return (
        <AuthForgotShell activeStep={step}>
            <div className={`${authStyles.formPanel} px-6 py-8 sm:px-10 sm:py-10`}>

                    {/* ── BƯỚC 1: Nhập email ── */}
                    {step === "email" && (
                        <>
                            <header className="text-center mb-10">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--auth-panel-wash)] text-[var(--auth-primary)] mb-6">
                                    <span className="material-symbols-outlined text-4xl" aria-hidden="true">lock_reset</span>
                                </div>
                                <h1 className="font-headline text-[2rem] font-extrabold tracking-tight text-[var(--auth-ink)] mb-3">{t("forgotTitle")}</h1>
                                <p className="text-[var(--auth-muted)] leading-relaxed px-4">{t("forgotSubtitle")}</p>
                            </header>

                            <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
                                {error && <AuthErrorMessage icon>{error}</AuthErrorMessage>}

                                <AuthTextField
                                    id="forgot-email"
                                    label={t("emailAddressLbl")}
                                    icon="mail"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck={false}
                                    placeholder={t("forgotEmailPlaceholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />

                                <AuthSubmitButton
                                    isLoading={isLoading}
                                    loadingLabel={t("sendingLabel")}
                                    idleLabel={t("sendResetLink")}
                                />

                                <div className="text-center pt-1">
                                    <Link href="/login" className={`${authStyles.linkText} text-sm inline-flex items-center gap-1 group`}>
                                        <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true">arrow_back</span>
                                        {t("backToLogin")}
                                    </Link>
                                </div>
                            </form>
                        </>
                    )}

                    {/* ── BƯỚC 2: Nhập OTP ── */}
                    {step === "otp" && (
                        <>
                            <header className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--auth-panel-wash)] text-[var(--auth-primary)] mb-6">
                                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">mark_email_read</span>
                                </div>
                                <h1 className="font-headline text-[2rem] font-extrabold tracking-tight text-[var(--auth-ink)] mb-3">{t("otpTitle")}</h1>
                                <p className="text-[var(--auth-muted)] leading-relaxed text-sm">{t("otpSubtitle")}</p>
                                <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[var(--auth-panel-wash)] rounded-full border border-[var(--auth-input-border)]">
                                    <span className="material-symbols-outlined text-[var(--auth-primary)] text-sm" aria-hidden="true">mail</span>
                                    <span className="font-mono text-sm font-semibold text-[var(--auth-primary)] tracking-tight">{email}</span>
                                </div>
                            </header>

                            {resendToast && (
                                <div role="alert" aria-live="polite"
                                    className={`mb-6 flex items-center gap-3 p-4 rounded-xl border ${resendToast === "success" ? "bg-emerald-50 border-emerald-200/60 text-emerald-800" : "bg-red-50 border-red-200/60 text-red-800"}`}>
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                                        {resendToast === "success" ? "check_circle" : "error"}
                                    </span>
                                    <p className="text-sm font-medium">
                                        {resendToast === "success" ? t("resendSuccess") : t("resendError")}
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <div className="space-y-3">
                                    <label className={`${authStyles.fieldLabel} block text-center`}>
                                        {t("otpLabel")}
                                    </label>
                                    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                                        {otpDigits.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={(el) => { otpRefs.current[i] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                className={authStyles.otpDigit}
                                                aria-label={`Digit ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {error && <AuthErrorMessage icon>{error}</AuthErrorMessage>}

                                <p className="text-xs text-[var(--auth-muted)] text-center leading-relaxed">{t("otpInfo")}</p>

                                <AuthSubmitButton
                                    isLoading={isLoading}
                                    loadingLabel={t("otpVerifyingLabel")}
                                    idleLabel={t("otpVerifyBtn")}
                                />

                                <div className="flex items-center justify-between pt-1">
                                    <button type="button"
                                        onClick={() => { setStep("email"); setError(""); setOtpDigits(["", "", "", "", "", ""]); }}
                                        className={`${authStyles.linkText} text-sm inline-flex items-center gap-1 group`}>
                                        <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true">arrow_back</span>
                                        {t("backToEmail")}
                                    </button>
                                    <button type="button" onClick={handleResend} disabled={isLoading || countdown > 0}
                                        className={`${authStyles.linkText} text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}>
                                        {isLoading
                                            ? t("sendingLabel")
                                            : countdown > 0
                                                ? t("resendCooldown", { seconds: countdown })
                                                : t("resendLink")}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* ── BƯỚC 3: Đặt mật khẩu mới ── */}
                    {step === "newPassword" && (
                        <>
                            <header className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--auth-panel-wash)] text-[var(--auth-primary)] mb-6">
                                    <span className="material-symbols-outlined text-4xl" aria-hidden="true">key</span>
                                </div>
                                <h1 className="font-headline text-[2rem] font-extrabold tracking-tight text-[var(--auth-ink)] mb-3">{t("newPasswordTitle")}</h1>
                                <p className="text-[var(--auth-muted)] leading-relaxed text-sm">{t("newPasswordSubtitle")}</p>
                            </header>

                            <form onSubmit={handleResetPassword} className="space-y-5">
                                {error && <AuthErrorMessage icon>{error}</AuthErrorMessage>}

                                <AuthPasswordField
                                    id="new-password"
                                    label={t("newPasswordLbl")}
                                    required
                                    autoComplete="new-password"
                                    placeholder={t("newPasswordPlace")}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isLoading}
                                    isVisible={showPassword}
                                    onToggleVisible={() => setShowPassword((v) => !v)}
                                    showLabel={t("showPassword")}
                                    hideLabel={t("hidePassword")}
                                    helperText={
                                        newPassword.length > 0 ? (
                                            <div className={`${authStyles.inlineReveal} rounded-[var(--auth-radius-sm)] border border-[var(--auth-input-border)] bg-[var(--auth-surface)] p-3`}>
                                                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--auth-muted)]">
                                                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">info</span>
                                                    {t("passwordRequirementsTitle")}
                                                </p>
                                                <ul className="grid gap-1 text-xs font-medium text-[var(--auth-muted)] sm:grid-cols-2">
                                                    {passwordRequirements.map((item) => (
                                                        <li key={item.label} className={item.met ? "flex items-center gap-1.5 text-[var(--auth-success)]" : "flex items-center gap-1.5"}>
                                                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                                                                {item.met ? "check_circle" : "radio_button_unchecked"}
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
                                    id="confirm-password"
                                    label={t("confirmPasswordLbl")}
                                    icon="lock_reset"
                                    required
                                    autoComplete="new-password"
                                    placeholder={t("confirmPasswordPlace")}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    isVisible={showConfirmPassword}
                                    onToggleVisible={() => setShowConfirmPassword((v) => !v)}
                                    showLabel={t("showPasswordConfirm")}
                                    hideLabel={t("hidePasswordConfirm")}
                                    error={confirmPassword.length > 0 && confirmPassword !== newPassword}
                                    helperText={
                                        confirmPassword && confirmPassword !== newPassword ? (
                                            <p className={`${authStyles.inlineReveal} flex items-center gap-1 text-xs font-semibold text-[var(--auth-danger)]`}>
                                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                                                {t("passwordsNotMatch")}
                                            </p>
                                        ) : null
                                    }
                                />

                                <AuthSubmitButton
                                    isLoading={isLoading}
                                    loadingLabel={t("updatingPasswordLabel")}
                                    idleLabel={t("updatePasswordBtn")}
                                />
                            </form>
                        </>
                    )}

                    {/* ── THÀNH CÔNG ── */}
                    {step === "success" && (
                        <div className="text-center">
                            <div className="relative inline-flex items-center justify-center mb-8">
                                <div className="absolute w-20 h-20 rounded-2xl bg-emerald-200/40 animate-pulse-ring" />
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-sm border border-emerald-200/30">
                                    <span className="material-symbols-outlined text-emerald-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
                                </div>
                            </div>
                            <h1 className="font-headline text-2xl font-extrabold tracking-tight mb-3">{t("passwordUpdatedTitle")}</h1>
                            <p className="text-on-surface-variant leading-relaxed text-sm mb-8">{t("passwordUpdatedDesc")}</p>
                            <Link href="/login"
                                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-semibold rounded-full hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2">
                                {t("goToLogin")}
                            </Link>
                        </div>
                    )}

            </div>
        </AuthForgotShell>
    );
}
