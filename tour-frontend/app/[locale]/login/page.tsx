'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('accessToken', data.access_token);
                localStorage.setItem('refreshToken', data.refresh_token);
                localStorage.setItem('userName', data.user?.fullName || '');

                // Phát sự kiện để Header tự cập nhật chữ Đăng nhập thành Avatar
                window.dispatchEvent(new Event('auth-change'));

                // Chuyển trang mượt mà qua Next Router (0ms delay)
                router.push('/');

            } else {
                const errData = await res.json();
                setError(errData.message || 'Invalid credentials.');
            }
        } catch (err) {
            setError('Server connection error.');
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
                                <h4 className="text-sm font-bold text-slate-800 font-headline">Success!</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{successMsg}</p>
                            </div>
                        </div>
                    </div>
                )}
                <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm">
                    <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
                        <div className="text-xl font-bold tracking-tight text-blue-950">
                            Azure Horizon
                        </div>
                        <nav className="hidden md:flex gap-8 items-center">
                            <a className="text-slate-600 hover:text-blue-800 transition-colors font-medium" href="#">Destinations</a>
                            <a className="text-slate-600 hover:text-blue-800 transition-colors font-medium" href="#">Experiences</a>
                            <a className="text-slate-600 hover:text-blue-800 transition-colors font-medium" href="#">Journal</a>
                        </nav>
                        <div className="flex items-center gap-4">
                            <button className="px-6 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-headline font-semibold text-sm active:scale-95 duration-200 transition-all">
                                Sign In
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-grow flex items-center justify-center p-6 mt-16 relative overflow-hidden">
                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-container rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-secondary-fixed rounded-full blur-3xl opacity-30"></div>
                    </div>
                    <div className="w-full max-w-md relative z-10">
                        <div className="bg-surface-container-lowest rounded-xl editorial-shadow p-8 md:p-10 border border-outline-variant/10">
                            <div className="mb-10 text-center">
                                <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">Welcome Back</h1>
                                <p className="text-on-surface-variant body-md">Sign in to continue your journey</p>
                            </div>

                            <form className="space-y-6" onSubmit={handleLogin}>
                                {error && (
                                    <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium border border-error/20">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="block font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-semibold ml-1">Email</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                                        <input
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-transparent rounded-lg focus:ring-0 focus:border-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 border border-transparent"
                                            placeholder="name@example.com"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-semibold ml-1">Password</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                                        <input
                                            required
                                            className="w-full pl-12 pr-12 py-3 bg-surface-container-low border-transparent rounded-lg focus:ring-0 focus:border-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 border border-transparent"
                                            placeholder="••••••••"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" type="button" onClick={() => setShowPassword(!showPassword)}>
                                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    <div className="flex justify-end">
                                        <Link href="/forgot-password" className="font-label text-[0.6875rem] uppercase tracking-wider text-primary font-bold hover:underline">Forgot Password?</Link>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-headline font-bold text-base tracking-wide editorial-shadow active:scale-[0.98] transition-all" type="submit">
                                    Sign In to Account
                                </button>
                            </form>

                            <div className="mt-10 pt-8 border-t border-outline-variant/15 text-center">
                                <p className="text-sm text-on-surface-variant font-medium">
                                    Don't have an account yet?
                                    <Link
                                        href="/register"
                                        className="text-primary font-bold hover:underline ml-1 cursor-pointer"
                                    >
                                        Create an account
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

                <footer className="w-full border-t border-slate-200/50 bg-surface-container">
                    <div className="flex flex-col md:flex-row justify-between items-center px-12 py-8 gap-4 max-w-7xl mx-auto">
                        <div className="text-lg font-bold text-blue-950">
                            Azure Horizon
                        </div>
                        <div className="flex gap-6">
                            <a className="font-label text-label-sm tracking-wide uppercase text-slate-500 hover:text-blue-800 transition-colors" href="#">Privacy Policy</a>
                            <a className="font-label text-label-sm tracking-wide uppercase text-slate-500 hover:text-blue-800 transition-colors" href="#">Terms of Service</a>
                            <a className="font-label text-label-sm tracking-wide uppercase text-slate-500 hover:text-blue-800 transition-colors" href="#">Support</a>
                        </div>
                        <div className="font-label text-label-sm tracking-wide uppercase text-slate-500">
                            © 2024 Azure Horizon. All rights reserved.
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}