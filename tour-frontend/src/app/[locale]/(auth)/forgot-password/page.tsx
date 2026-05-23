"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");
    const [resendToast, setResendToast] = useState<"success" | "error" | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("http://localhost:3000/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.message || "Failed to send email");
            }

            // Nếu gửi thành công, bật màn hình Success
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "An error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsLoading(true);
        setResendToast(null);
        try {
            const res = await fetch("http://localhost:3000/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.message || "Failed to send email");
            }
            // Hiện toast thành công trên giao diện
            setResendToast("success");
        } catch (err: any) {
            // Hiện toast lỗi trên giao diện
            setResendToast("error");
        } finally {
            setIsLoading(false);
            // Tự tắt toast sau 4 giây
            setTimeout(() => setResendToast(null), 4000);
        }
    };

    // Quay lại form nhập email để chỉnh sửa
    const handleBackToForm = () => {
        setIsSuccess(false);
        setResendToast(null);
    };

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-surface font-body text-on-surface">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseRing {
                    0% { transform: scale(0.9); opacity: 0.6; }
                    50% { transform: scale(1.15); opacity: 0; }
                    100% { transform: scale(0.9); opacity: 0; }
                }
                .animate-slide-in-up { animation: slideInUp 0.5s ease-out both; }
                .animate-toast { animation: toastSlideIn 0.35s ease-out both; }
                .animate-pulse-ring { animation: pulseRing 2s ease-in-out infinite; }
            `}} />

            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary-fixed opacity-20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-secondary-fixed opacity-15 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-[480px]">
                <div className="flex justify-center mb-10">
                    <h1 className="font-headline text-2xl font-bold tracking-tight text-primary">Azure Horizon</h1>
                </div>

                <div className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 editorial-shadow border border-outline-variant/10">

                    {/* Form State */}
                    {!isSuccess ? (
                        <>
                            <header className="text-center mb-10">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-low text-primary mb-6">
                                    <span className="material-symbols-outlined text-4xl">lock_reset</span>
                                </div>
                                <h2 className="font-headline text-3xl font-extrabold tracking-tight mb-3">Forgot Password</h2>
                                <p className="text-on-surface-variant leading-relaxed px-4">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </header>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="font-label text-[0.6875rem] font-semibold tracking-widest text-on-surface-variant px-1 uppercase">
                                        Email Address
                                    </label>
                                    <div className="relative flex items-center group">
                                        <span className="material-symbols-outlined absolute left-4 text-on-surface-variant group-focus-within:text-primary transition-colors">mail</span>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@luxury-travel.com"
                                            className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-0 rounded-xl focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all duration-300 placeholder:text-outline/60"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-red-500 text-sm px-1">{error}</p>}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-semibold rounded-full hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isLoading ? "Sending..." : "Send Reset Link"}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        /* =====================================================
                           SUCCESS STATE - Thiết kế Premium cho Azure Horizon
                           ===================================================== */
                        <div className="animate-slide-in-up">
                            {/* Toast thông báo Resend - hiện ngay trên giao diện */}
                            {resendToast && (
                                <div className={`animate-toast mb-6 flex items-center gap-3 p-4 rounded-xl border ${resendToast === "success"
                                    ? "bg-emerald-50 border-emerald-200/60 text-emerald-800"
                                    : "bg-red-50 border-red-200/60 text-red-800"
                                    }`}>
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {resendToast === "success" ? "check_circle" : "error"}
                                    </span>
                                    <p className="text-sm font-medium">
                                        {resendToast === "success"
                                            ? "A new reset link has been sent!"
                                            : "Failed to resend. Please try again."}
                                    </p>
                                </div>
                            )}

                            {/* Icon với hiệu ứng pulse ring */}
                            <div className="text-center mb-8">
                                <div className="relative inline-flex items-center justify-center">
                                    <div className="absolute w-20 h-20 rounded-2xl bg-emerald-200/40 animate-pulse-ring"></div>
                                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-sm border border-emerald-200/30">
                                        <span className="material-symbols-outlined text-emerald-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            mark_email_read
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tiêu đề và mô tả */}
                            <div className="text-center mb-8">
                                <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface mb-3">
                                    Check your inbox
                                </h3>
                                <p className="text-on-surface-variant leading-relaxed text-sm">
                                    We've sent a password reset link to
                                </p>
                                <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-surface-container-low rounded-full border border-outline-variant/15">
                                    <span className="material-symbols-outlined text-primary text-sm">mail</span>
                                    <span className="font-mono text-sm font-semibold text-primary tracking-tight">{email}</span>
                                </div>
                            </div>

                            {/* Hướng dẫn nhỏ */}
                            <div className="bg-surface-container-low/50 rounded-xl p-4 mb-8 border border-outline-variant/10">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-on-surface-variant text-lg mt-0.5">info</span>
                                    <p className="text-xs text-on-surface-variant leading-relaxed">
                                        The link will expire in <span className="font-bold text-on-surface">15 minutes</span>. If you don't see the email, check your spam folder.
                                    </p>
                                </div>
                            </div>

                            {/* Nút hành động */}
                            <div className="space-y-3">
                                {/* Nút Resend chính */}
                                <button
                                    onClick={handleResend}
                                    disabled={isLoading}
                                    className={`w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-semibold rounded-full hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {isLoading ? "hourglass_empty" : "refresh"}
                                    </span>
                                    {isLoading ? "Sending..." : "Resend Link"}
                                </button>

                                {/* Nút Quay lại */}
                                <button
                                    onClick={handleBackToForm}
                                    className="w-full py-3.5 text-on-surface-variant font-semibold rounded-full hover:bg-surface-container-low transition-all duration-300 flex items-center justify-center gap-2 group"
                                >
                                    <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
                                    Use a different email
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}