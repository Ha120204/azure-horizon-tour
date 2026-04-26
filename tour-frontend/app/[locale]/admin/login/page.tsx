'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import './login.css';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    // Auto-redirect nếu đã đăng nhập với role hợp lệ
    useEffect(() => {
        const checkExistingAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setIsCheckingAuth(false);
                return;
            }

            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
                if (res.ok) {
                    const user = await res.json();
                    const role = user.role || user.data?.role;
                    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'STAFF') {
                        router.replace('/admin');
                        return;
                    }
                }
            } catch {
                // Token không hợp lệ — cho phép hiển thị form
            }

            setIsCheckingAuth(false);
        };

        checkExistingAuth();
    }, [router]);

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
            const data = payload.data || payload;

            // Lưu token
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('userName', data.user?.fullName || '');

            // Kiểm tra role — chặn CUSTOMER
            const role = data.user?.role;
            if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'STAFF') {
                // Xóa token vừa lưu — không cho phép truy cập
                localStorage.removeItem('accessToken');
                localStorage.removeItem('userName');
                // Logout phiên vừa tạo
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                }).catch(() => {});
                setError('Tài khoản của bạn không có đặc quyền quản trị. Vui lòng liên hệ quản trị viên.');
                setIsLoading(false);
                return;
            }

            // Phát sự kiện auth
            window.dispatchEvent(new Event('auth-change'));

            // Chuyển hướng vào dashboard
            router.replace('/admin');
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
                            <span className="admin-login-logo-subtitle">ADMIN PORTAL</span>
                        </div>
                    </div>
                    <p className="admin-login-tagline">Cổng quản trị nội bộ dành cho nhân viên</p>
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
