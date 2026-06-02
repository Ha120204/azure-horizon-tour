'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import './login.css';
import { API_BASE_URL } from '@/lib/constants';
import { clearClientUserStorage, fetchOptionalAuth, logoutAuthSession, saveClientUserStorage } from '@/lib/authSession';

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

    // Auto-redirect nếu đã đăng nhập với role hợp lệ
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
                        // Đã đăng nhập với quyền admin → vào dashboard
                        router.replace('/admin');
                        return;
                    }

                    // Đang đăng nhập bằng tài khoản Customer → auto-logout
                    // Tránh trường hợp user đã đăng nhập frontend rồi vào admin
                    await logoutAuthSession();
                }
            } catch {
                // Token không hợp lệ — cho phép hiển thị form
            }

            setIsCheckingAuth(false);
        };

        checkExistingAuth();
    }, [router, skipExistingAuthCheck]);

    // Focus email input khi trang sẵn sàng
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

    // Loading khi kiểm tra auth ban đầu
    if (isCheckingAuth) {
        return (
            <div className="admin-login-page">
                <div className="admin-login-loading">
                    <span className="material-symbols-outlined admin-login-spinner">progress_activity</span>
                </div>
                
            </div>
        );
    }

    return (
        <div className="admin-login-page">
            {/* Animated background particles */}
            <div className="admin-login-bg">
                <div className="admin-login-orb admin-login-orb-1" />
                <div className="admin-login-orb admin-login-orb-2" />
                <div className="admin-login-orb admin-login-orb-3" />
                <div className="admin-login-grid-overlay" />
            </div>

            {/* Main card */}
            <div className="admin-login-container">
                {/* Brand header */}
                <div className="admin-login-brand">
                    <div className="admin-login-logo">
                        <div className="admin-login-logo-icon">
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}
                            >
                                explore
                            </span>
                        </div>
                        <div className="admin-login-logo-text">
                            <span className="admin-login-logo-title">Azure Horizon</span>
                            <span className="admin-login-logo-subtitle">INTERNAL PORTAL</span>
                        </div>
                    </div>
                    <p className="admin-login-tagline">Đăng nhập vào hệ thống quản trị</p>
                </div>

                {/* Login form */}
                <form className="admin-login-form" onSubmit={handleLogin}>
                    {error && (
                        <div className="admin-login-error" role="alert">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={`admin-login-field ${focusedField === 'email' ? 'focused' : ''} ${email ? 'has-value' : ''}`}>
                        <label className="admin-login-label" htmlFor="admin-email">EMAIL</label>
                        <div className="admin-login-input-wrap">
                            <span className="material-symbols-outlined admin-login-input-icon">mail</span>
                            <input
                                ref={emailRef}
                                id="admin-email"
                                type="email"
                                required
                                autoComplete="email"
                                className="admin-login-input"
                                placeholder="admin@azurehorizon.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </div>
                    </div>

                    <div className={`admin-login-field ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
                        <label className="admin-login-label" htmlFor="admin-password">MẬT KHẨU</label>
                        <div className="admin-login-input-wrap">
                            <span className="material-symbols-outlined admin-login-input-icon">lock</span>
                            <input
                                id="admin-password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                className="admin-login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <button
                                type="button"
                                className="admin-login-toggle-pw"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                <span className="material-symbols-outlined">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="admin-login-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="material-symbols-outlined admin-login-spinner" style={{ fontSize: '20px' }}>
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
                <div className="admin-login-footer">
                    <div className="admin-login-footer-icons">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified_user</span>
                        <span className="admin-login-footer-text">Kết nối bảo mật SSL/TLS</span>
                    </div>
                    <span className="admin-login-footer-copy">© 2026 Azure Horizon — Internal Use Only</span>
                </div>
            </div>

        </div>
    );
}
