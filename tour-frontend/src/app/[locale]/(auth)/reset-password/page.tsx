'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please try again.');
            return;
        }

        if (!token) {
            setError('Invalid or missing reset token. Please request a new password reset link.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:3000/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.message || 'Failed to reset password. The link may have expired.');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
            {/* Header */}
            <header className="bg-surface sticky top-0 z-50">
                <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-on-surface font-headline tracking-tight">Azure Horizon</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link className="text-on-surface-variant hover:text-primary-container transition-colors font-medium" href="/">Explore</Link>
                        <Link className="text-on-surface-variant hover:text-primary-container transition-colors font-medium" href="#">Reservations</Link>
                        <Link className="text-primary font-semibold font-headline" href="#">Account</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-all">lock_reset</span>
                        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-all">help_outline</span>
                    </div>
                </div>
                <div className="bg-surface-container h-px w-full"></div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-24 bg-surface-container-low">
                <div className="w-full max-w-md bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 relative overflow-hidden"
                     style={{ boxShadow: '0 8px 32px rgba(25, 28, 33, 0.04)' }}>

                    {/* Success State */}
                    {isSuccess ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-tertiary-container/10 text-tertiary-container rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <h1 className="font-headline text-2xl font-bold text-on-surface mb-2 tracking-tight">Password updated successfully</h1>
                            <p className="font-body text-on-surface-variant mb-8">Your account security has been updated. You can now use your new password to log in.</p>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center w-full text-on-primary font-label text-sm uppercase tracking-wider font-semibold py-4 rounded-full hover:shadow-lg transition-all duration-300"
                                style={{ background: 'linear-gradient(135deg, #003f87 0%, #0056b3 100%)' }}
                            >
                                Go to Login
                            </Link>
                        </div>
                    ) : (
                        /* Form View */
                        <div>
                            {/* Card Header */}
                            <div className="flex flex-col items-center mb-10">
                                <div className="w-14 h-14 bg-surface-container flex items-center justify-center rounded-2xl mb-6">
                                    <span className="material-symbols-outlined text-primary text-3xl">key</span>
                                </div>
                                <h1 className="font-headline text-3xl font-bold text-on-surface mb-2 tracking-tight text-center">Set New Password</h1>
                                <p className="font-body text-on-surface-variant text-center leading-relaxed">Please enter your new password below to regain access to Azure Horizon.</p>
                            </div>

                            {/* Reset Form */}
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium border border-error/20">
                                        {error}
                                    </div>
                                )}

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="font-label text-[0.6875rem] uppercase tracking-[0.1em] font-bold text-on-surface-variant ml-1">New Password</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                                        <input
                                            className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                                            placeholder="••••••••"
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="font-label text-[0.6875rem] uppercase tracking-[0.1em] font-bold text-on-surface-variant ml-1">Confirm New Password</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock_reset</span>
                                        <input
                                            className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                                            placeholder="••••••••"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            <span className="material-symbols-outlined">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="pt-4">
                                    <button
                                        className="w-full text-on-primary font-label text-sm uppercase tracking-widest font-bold py-5 rounded-full hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70"
                                        style={{ background: 'linear-gradient(135deg, #003f87 0%, #0056b3 100%)' }}
                                        type="submit"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                Updating...
                                                <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                            </>
                                        ) : (
                                            'Update Password'
                                        )}
                                    </button>
                                </div>

                                {/* Back Link */}
                                <div className="text-center pt-2">
                                    <Link
                                        className="font-body text-sm text-primary hover:text-primary-container font-medium transition-colors flex items-center justify-center gap-1 group"
                                        href="/login"
                                    >
                                        <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                        Back to Sign In
                                    </Link>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Background decorations */}
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-secondary-container/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-surface border-t border-outline-variant/15">
                <div className="w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <span className="text-sm font-bold text-on-surface font-headline">Azure Horizon</span>
                        <span className="font-body text-[0.6875rem] uppercase tracking-widest text-on-surface-variant">© 2026 Azure Horizon. All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a className="font-body text-[0.6875rem] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-opacity duration-300" href="#">Privacy Policy</a>
                        <a className="font-body text-[0.6875rem] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-opacity duration-300" href="#">Terms of Service</a>
                        <a className="font-body text-[0.6875rem] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-opacity duration-300" href="#">Security</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
