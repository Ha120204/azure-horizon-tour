"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

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
            setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-surface font-body text-on-surface">
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
                        /* Success State */
                        <div className="text-center animate-in fade-in duration-500">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 text-green-600 mb-6">
                                <span className="material-symbols-outlined text-4xl">mark_email_read</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Check your email</h3>
                            <p className="text-on-surface-variant mb-8">We've sent a password reset link to <span className="font-semibold">{email}</span>.</p>
                            <button
                                onClick={() => setIsSuccess(false)}
                                className="w-full py-4 bg-surface-container-high text-on-surface font-semibold rounded-full hover:bg-surface-dim transition-colors"
                            >
                                Resend Link
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}