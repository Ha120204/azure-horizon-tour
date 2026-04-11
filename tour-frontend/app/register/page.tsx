'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp!');
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
                setError(errData.message || 'Đăng ký thất bại.');
            }
        } catch (err) {
            setError('Lỗi kết nối server.');
        }
    };

    return (
        <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
            <main className="flex-grow flex items-center justify-center px-6 py-12 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/5 blur-[120px] pointer-events-none"></div>

                {/* Registration Card */}
                <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-lg ambient-glow p-8 md:p-12 z-10 border border-outline-variant/10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container mb-6">
                            <span className="material-symbols-outlined text-primary text-3xl">explore</span>
                        </div>
                        <h1 className="text-[2rem] font-bold tracking-tight text-on-surface mb-2 font-headline">Join Azure Horizon</h1>
                        <p className="text-on-surface-variant text-body-md leading-relaxed">Create an account to start exploring</p>
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
                                    <h4 className="text-sm font-bold text-emerald-800 font-headline">Đăng ký thành công!</h4>
                                    <p className="text-xs text-emerald-600 mt-1">{success}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-[11px] font-semibold tracking-wider uppercase text-on-surface-variant px-1">Full Name</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] -mt-[2px]">person</span>
                                <input
                                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60 text-sm"
                                    placeholder="Enter your full name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-semibold tracking-wider uppercase text-on-surface-variant px-1">Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] -mt-[2px]">mail</span>
                                <input
                                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60 text-sm"
                                    placeholder="name@example.com"
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
                                <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">Password</label>

                                <div className="flex items-center bg-slate-50/50 rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all border border-slate-100">
                                    <span className="material-symbols-outlined text-slate-400 mr-2 flex-shrink-0">lock</span>

                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="flex-1 bg-transparent border-none outline-none py-3 text-sm min-w-0 text-slate-700"
                                        placeholder="Enter your password"
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
                                <label className="text-[11px] font-bold uppercase tracking-widest text-outline font-label">Confirm Password</label>

                                <div className="flex items-center bg-slate-50/50 rounded-lg px-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all border border-slate-100">
                                    <span className="material-symbols-outlined text-slate-400 mr-2 flex-shrink-0">lock_reset</span>

                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="flex-1 bg-transparent border-none outline-none py-3 text-sm min-w-0 text-slate-700"
                                        placeholder="Confirm password"
                                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} // Bật lại biến của em
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="text-slate-400 hover:text-primary ml-2 flex-shrink-0 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showConfirmPassword ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                        </div>

                        <button className="w-full hero-gradient text-on-primary py-4 rounded-full font-headline font-semibold text-lg hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4" type="submit">
                            Create Account
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                        <p className="text-on-surface-variant text-sm">
                            Already have an account?
                            <Link href="/login" className="text-primary font-semibold hover:underline ml-1 transition-all">Log in</Link>
                        </p>
                    </div>
                </div>
            </main>

            <footer className="w-full border-t border-slate-200/50 bg-surface-container">
                <div className="flex flex-col md:flex-row justify-between items-center px-12 py-8 gap-4 max-w-7xl mx-auto text-slate-500 text-[12px] uppercase tracking-wide">
                    <div className="text-lg font-bold text-blue-950 font-headline normal-case">Azure Horizon</div>
                    <div className="flex gap-6">
                        <a className="hover:text-blue-800" href="#">Privacy Policy</a>
                        <a className="hover:text-blue-800" href="#">Terms of Service</a>
                        <a className="hover:text-blue-800" href="#">Support</a>
                    </div>
                    <div>© 2024 Azure Horizon. All rights reserved.</div>
                </div>
            </footer>
        </div>
    );
}