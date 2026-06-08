'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { API_BASE_URL } from '@/lib/http/constants';
import { clearClientUserStorage, fetchOptionalAuth, logoutAuthSession, saveClientUserStorage } from '@/lib/auth/authSession';

export default function AdminLoginPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const skipExistingAuthCheck = searchParams.get('loggedOut') === '1' || searchParams.get('switch') === '1';

    const getAdminHomePath = () => {
        const match = (pathname ?? '').match(/^\/(vi|en)(?=\/|$)/);
        const localePrefix = match ? `/${match[1]}` : '';
        return `${localePrefix}/admin`;
    };

    useEffect(() => {
        const checkExistingAuth = async () => {
            if (skipExistingAuthCheck) {
                clearClientUserStorage();
                setIsCheckingAuth(false);
                return;
            }

            try {
                const res = await fetchOptionalAuth(`${API_BASE_URL}/auth/profile`);
                if (res.ok) {
                    const payload = await res.json();
                    // Backend trả về { data: { role } } — không phải { role } trực tiếp
                    const profile = payload.data ?? payload;
                    const role = profile.role;

                    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'STAFF') {
                        router.replace('/admin');
                        return;
                    }

                    // Đang đăng nhập bằng tài khoản Customer → auto-logout
                    await logoutAuthSession();
                }
            } catch {
                // Token không hợp lệ — cho phép hiển thị form
            }

            setIsCheckingAuth(false);
        };

        checkExistingAuth();
    }, [router, skipExistingAuthCheck]);

    useEffect(() => {
        if (!isCheckingAuth && emailRef.current) {
            emailRef.current.focus();
        }
    }, [isCheckingAuth]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const errData = await res.json();
                setError(errData.message || 'Email hoặc mật khẩu không đúng.');
                setIsLoading(false);
                return;
            }

            const payload = await res.json();
            const data = payload.data ?? payload;

            // Kiểm tra role — chặn CUSTOMER trước khi lưu
            const role = data.user?.role;
            if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
                // Logout phiên vừa tạo ngay lập tức
                await logoutAuthSession();
                setError('Tài khoản của bạn không có đặc quyền quản trị. Vui lòng liên hệ quản trị viên.');
                setIsLoading(false);
                return;
            }

            // Lưu thông tin user hợp lệ
            saveClientUserStorage(data.user ?? {}, { clearExisting: true, markLogin: true });

            // Phát sự kiện auth
            window.dispatchEvent(new Event('auth-change'));

            // Chuyển hướng vào dashboard
            window.location.assign(getAdminHomePath());
        } catch {
            setError('Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.');
            setIsLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff]">
                <div className="flex items-center justify-center text-[#2563eb]">
                    <span className="material-symbols-outlined animate-spin text-[48px]">progress_activity</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff] relative overflow-hidden">
            {/* Animated background */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: [
                        'radial-gradient(ellipse 80% 60% at 20% 0%, #dbeafe 0%, transparent 60%)',
                        'radial-gradient(ellipse 60% 50% at 80% 100%, #e0e7ff 0%, transparent 60%)',
                        'radial-gradient(ellipse 50% 40% at 50% 50%, #f0f9ff 0%, transparent 70%)',
                    ].join(', '),
                }}
            >
                <div
                    className="absolute rounded-full blur-[90px] opacity-[0.55] w-[600px] h-[600px] -top-[15%] -left-[10%] animate-orb-1"
                    style={{ background: 'radial-gradient(circle, #93c5fd 0%, transparent 70%)' }}
                />
                <div
                    className="absolute rounded-full blur-[90px] opacity-[0.55] w-[500px] h-[500px] -bottom-[20%] -right-[8%] animate-orb-2"
                    style={{ background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)' }}
                />
                {/* Orb 3: transform giữ trong keyframe (adminOrbFloat3 đã bao gồm translate(-50%,-50%)) */}
                <div
                    className="absolute rounded-full blur-[90px] opacity-[0.55] w-[300px] h-[300px] top-1/2 left-1/2 animate-orb-3"
                    style={{
                        background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)',
                        transform: 'translate(-50%, -50%)',
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: [
                            'linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px)',
                            'linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px)',
                        ].join(', '),
                        backgroundSize: '56px 56px',
                        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
                    }}
                />
            </div>

            {/* Main card */}
            <div
                className="relative z-10 w-full max-w-[440px] mx-5 pt-[44px] px-10 pb-9 rounded-[28px] backdrop-blur-[40px] backdrop-saturate-150 animate-card-entry max-sm:mx-3 max-sm:pt-8 max-sm:px-6 max-sm:pb-7 max-sm:rounded-[20px]"
                style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: [
                        '0 0 0 1px rgba(255, 255, 255, 0.8) inset',
                        '0 20px 60px -12px rgba(37, 99, 235, 0.12)',
                        '0 4px 24px -4px rgba(0, 0, 0, 0.06)',
                    ].join(', '),
                }}
            >
                {/* Brand header */}
                <div className="text-center mb-9">
                    <div className="flex items-center justify-center gap-[14px] mb-4">
                        <div
                            className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center text-white animate-logo-pulse"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}
                            >
                                explore
                            </span>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[22px] font-extrabold text-[#0f172a] tracking-[-0.02em] leading-[1.1] max-sm:text-[19px]">
                                Azure Horizon
                            </span>
                            <span className="text-[10px] font-bold text-[#2563eb] tracking-[0.2em] mt-1">
                                INTERNAL PORTAL
                            </span>
                        </div>
                    </div>
                    <p className="text-[13px] text-[#64748b] font-medium m-0">Đăng nhập vào hệ thống quản trị</p>
                </div>

                {/* Login form */}
                <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                    {error && (
                        <div
                            className="flex items-center gap-[10px] px-4 py-3 rounded-[12px] text-red-600 text-[13px] font-medium leading-[1.5] animate-shake"
                            style={{
                                background: 'rgba(239, 68, 68, 0.07)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                            }}
                            role="alert"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Email */}
                    <div className="flex flex-col gap-2">
                        <label
                            className={`text-[10px] font-bold tracking-[0.15em] ml-1 transition-colors duration-200 ${focusedField === 'email' ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}
                            htmlFor="admin-email"
                        >
                            EMAIL
                        </label>
                        <div className="relative flex items-center">
                            <span className={`material-symbols-outlined absolute left-4 text-[20px] transition-colors duration-200 pointer-events-none ${focusedField === 'email' ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}>
                                mail
                            </span>
                            <input
                                ref={emailRef}
                                id="admin-email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full py-[14px] pr-4 pl-12 bg-slate-100/80 border border-slate-200 rounded-[14px] text-[#0f172a] text-[14px] font-medium outline-none transition-all duration-[250ms] placeholder:text-[#94a3b8] placeholder:font-normal focus:bg-white focus:border-[rgba(37,99,235,0.4)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08),0_1px_6px_rgba(37,99,235,0.06)]"
                                placeholder="admin@azurehorizon.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-2">
                        <label
                            className={`text-[10px] font-bold tracking-[0.15em] ml-1 transition-colors duration-200 ${focusedField === 'password' ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}
                            htmlFor="admin-password"
                        >
                            MẬT KHẨU
                        </label>
                        <div className="relative flex items-center">
                            <span className={`material-symbols-outlined absolute left-4 text-[20px] transition-colors duration-200 pointer-events-none ${focusedField === 'password' ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}>
                                lock
                            </span>
                            <input
                                id="admin-password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                className="w-full py-[14px] pr-4 pl-12 bg-slate-100/80 border border-slate-200 rounded-[14px] text-[#0f172a] text-[14px] font-medium outline-none transition-all duration-[250ms] placeholder:text-[#94a3b8] placeholder:font-normal focus:bg-white focus:border-[rgba(37,99,235,0.4)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08),0_1px_6px_rgba(37,99,235,0.06)]"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <button
                                type="button"
                                className="absolute right-[14px] bg-transparent border-0 text-[#94a3b8] cursor-pointer p-1 rounded-lg flex items-center justify-center transition-all duration-200 hover:text-[#475569] hover:bg-[rgba(15,23,42,0.05)]"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="admin-submit-btn relative overflow-hidden flex items-center justify-center gap-[10px] w-full py-4 px-6 mt-2 rounded-[14px] text-white text-[15px] font-bold cursor-pointer transition-all duration-300 disabled:opacity-65 disabled:cursor-not-allowed max-sm:py-[14px] max-sm:px-5 max-sm:text-[14px]"
                        disabled={isLoading}
                        style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 4px 16px -2px rgba(37, 99, 235, 0.3)',
                            letterSpacing: '0.01em',
                        }}
                    >
                        {isLoading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                                    progress_activity
                                </span>
                                Đang xác thực...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                                Đăng nhập vào Hệ thống
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-black/[0.06] text-center flex flex-col items-center gap-[10px]">
                    <div className="flex items-center gap-[6px] text-slate-300">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified_user</span>
                        <span className="text-[11px] font-semibold tracking-[0.05em] text-slate-300">Kết nối bảo mật SSL/TLS</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">© 2026 Azure Horizon — Internal Use Only</span>
                </div>
            </div>
        </div>
    );
}
