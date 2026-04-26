'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminProfile {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    dob?: string | null;
    gender?: string | null;
}

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    SUPER_ADMIN: { label: 'Super Admin', color: 'text-amber-700', bg: 'bg-amber-500/10 border-amber-200', icon: 'shield_with_heart' },
    ADMIN:       { label: 'Admin',       color: 'text-violet-700', bg: 'bg-violet-500/10 border-violet-200', icon: 'admin_panel_settings' },
    STAFF:       { label: 'Staff',       color: 'text-sky-700',    bg: 'bg-sky-500/10 border-sky-200',    icon: 'support_agent' },
};

const getInitials = (name?: string | null) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
};

const formatDateToInputValue = (d: string | null | undefined) => {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; }
    catch { return ''; }
};

// ── Password Strength ─────────────────────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;
    if (score <= 1) return { score, label: 'Rất yếu', color: 'bg-red-500' };
    if (score === 2) return { score, label: 'Yếu', color: 'bg-orange-400' };
    if (score === 3) return { score, label: 'Trung bình', color: 'bg-yellow-400' };
    if (score === 4) return { score, label: 'Mạnh', color: 'bg-emerald-500' };
    return { score, label: 'Rất mạnh', color: 'bg-blue-500' };
}

// ── Toast Component ───────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };
    const iconColors = { success: 'text-emerald-500', error: 'text-red-500', info: 'text-blue-500' };
    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl shadow-slate-200/50 animate-in slide-in-from-bottom-4 duration-300 max-w-sm ${colors[toast.type]}`}>
            <span className={`material-symbols-outlined text-xl flex-shrink-0 ${iconColors[toast.type]}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {icons[toast.type]}
            </span>
            <p className="text-sm font-semibold flex-1">{toast.message}</p>
            <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
                <span className="material-symbols-outlined text-base">close</span>
            </button>
        </div>
    );
}

// ── Section Card Component ────────────────────────────────────────────────────

function SectionCard({ title, subtitle, icon, children }: {
    title: string; subtitle: string; icon: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div>
                    <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="px-7 py-6">{children}</div>
        </div>
    );
}

// ── Input Field ───────────────────────────────────────────────────────────────

function FieldInput({ label, id, icon, type = 'text', value, onChange, placeholder, disabled, hint, error, children }: {
    label: string; id: string; icon?: string; type?: string; value?: string;
    onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
    hint?: string; error?: string; children?: React.ReactNode;
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {label}
            </label>
            {children ?? (
                <div className="relative">
                    {icon && (
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                            {icon}
                        </span>
                    )}
                    <input
                        id={id}
                        type={type}
                        value={value}
                        onChange={e => onChange?.(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`w-full border rounded-xl py-3 text-sm font-medium text-slate-800 outline-none transition-all
                            ${icon ? 'pl-11 pr-4' : 'px-4'}
                            ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}
                            ${error ? 'border-red-400 focus:ring-red-100' : ''}`}
                    />
                </div>
            )}
            {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{error}</p>}
            {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminProfilePage() {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState | null>(null);

    // Info form
    const [infoForm, setInfoForm] = useState({ fullName: '', phone: '', dob: '', gender: '' });
    const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [infoDirty, setInfoDirty] = useState(false);

    // Avatar
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Password form
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
    const [isSavingPw, setIsSavingPw] = useState(false);

    // ── Toast helper ──────────────────────────────────────────────────────────
    const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // ── Fetch profile ─────────────────────────────────────────────────────────
    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const data: AdminProfile = json.data ?? json;
            setProfile(data);
            setInfoForm({
                fullName: data.fullName || '',
                phone: data.phone || '',
                dob: formatDateToInputValue(data.dob),
                gender: data.gender || '',
            });
        } catch {
            showToast('Không thể tải thông tin hồ sơ.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    // ── Info form dirty tracking ──────────────────────────────────────────────
    useEffect(() => {
        if (!profile) return;
        const isDiff =
            infoForm.fullName !== (profile.fullName || '') ||
            infoForm.phone !== (profile.phone || '') ||
            infoForm.dob !== formatDateToInputValue(profile.dob) ||
            infoForm.gender !== (profile.gender || '');
        setInfoDirty(isDiff);
    }, [infoForm, profile]);

    // ── Save info ─────────────────────────────────────────────────────────────
    const handleSaveInfo = async () => {
        const errors: Record<string, string> = {};
        if (!infoForm.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
        if (infoForm.phone && !/^[0-9]{9,11}$/.test(infoForm.phone.replace(/\s/g, '')))
            errors.phone = 'Số điện thoại không hợp lệ (9-11 số)';
        setInfoErrors(errors);
        if (Object.keys(errors).length) return;

        setIsSavingInfo(true);
        try {
            // Dùng PATCH /auth/profile — cùng endpoint với customer profile
            // Endpoint này tự lấy userId từ JWT token, không cần truyền :id
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: infoForm.fullName.trim(),
                    phone: infoForm.phone.trim() || undefined,
                    dob: infoForm.dob ? new Date(infoForm.dob).toISOString() : undefined,
                    gender: infoForm.gender || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi lưu thông tin');
            }
            // Sync localStorage name → TopAppBar + Header cùng cập nhật
            localStorage.setItem('userName', infoForm.fullName.trim());
            window.dispatchEvent(new Event('auth-change'));
            showToast('Cập nhật thông tin thành công!');
            fetchProfile();
        } catch (e: any) {
            showToast(e.message || 'Lỗi lưu thông tin.', 'error');
        } finally {
            setIsSavingInfo(false);
        }
    };

    // ── Avatar upload ─────────────────────────────────────────────────────────
    const handleAvatarFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ảnh không được lớn hơn 5MB', 'error');
            return;
        }
        // Preview ngay lập tức trước khi upload
        const reader = new FileReader();
        reader.onload = e => setAvatarPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            // Dùng POST /auth/avatar — cùng endpoint với customer profile
            // Backend đã có sẵn tại auth.controller.ts dòng 93
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/avatar`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Upload thất bại');
            }
            const result = await res.json();
            if (result.data?.avatarUrl) {
                setAvatarPreview(result.data.avatarUrl);
            }
            showToast('Cập nhật ảnh đại diện thành công!');
            fetchProfile();
        } catch (e: any) {
            setAvatarPreview(null);
            showToast(e.message || 'Upload ảnh thất bại.', 'error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // ── Change password ───────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        const errors: Record<string, string> = {};
        if (!pwForm.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
        if (!pwForm.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới';
        else if (pwForm.newPassword.length < 8) errors.newPassword = 'Mật khẩu mới tối thiểu 8 ký tự';
        else if (!/(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(pwForm.newPassword))
            errors.newPassword = 'Cần có chữ hoa, số và ký tự đặc biệt (@$!%*?&)';
        if (!pwForm.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
        else if (pwForm.confirmPassword !== pwForm.newPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        if (pwForm.newPassword === pwForm.currentPassword && pwForm.newPassword)
            errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';

        setPwErrors(errors);
        if (Object.keys(errors).length) return;

        setIsSavingPw(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: pwForm.currentPassword,
                    newPassword: pwForm.newPassword,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Đổi mật khẩu thất bại');
            }
            showToast('Đổi mật khẩu thành công!');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPwErrors({});
        } catch (e: any) {
            const msg = e.message || '';
            if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('invalid'))
                setPwErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
            else
                showToast(msg || 'Đổi mật khẩu thất bại.', 'error');
        } finally {
            setIsSavingPw(false);
        }
    };

    const strength = getPasswordStrength(pwForm.newPassword);
    const rc = profile ? (roleConfig[profile.role] ?? roleConfig.STAFF) : null;
    const displayAvatar = avatarPreview ?? profile?.avatarUrl ?? null;

    // ── Loading State ─────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <main className="flex-1 pt-8 px-8 pb-12 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
                    <p className="text-sm font-medium">Đang tải hồ sơ...</p>
                </div>
            </main>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <main className="flex-1 pt-8 px-8 pb-16 overflow-y-auto w-full max-w-[1200px] mx-auto">
            {/* ── Page Header ── */}
            <div className="mb-8">
                <h1 className="text-[1.75rem] font-bold text-slate-800 leading-tight">Hồ sơ cá nhân</h1>
                <p className="text-slate-500 text-sm mt-1">Quản lý thông tin tài khoản và bảo mật đăng nhập của bạn.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">

                {/* ── LEFT: Identity Card ── */}
                <div className="space-y-5">

                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                        {/* Gradient Header */}
                        <div className="relative h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 overflow-hidden">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, white 1px, transparent 1px), radial-gradient(circle at 70% 20%, white 1px, transparent 1px)', backgroundSize: '50px 50px, 35px 35px' }} />
                        </div>

                        {/* Avatar */}
                        <div className="px-6 pb-6">
                            <div className="flex justify-between items-end -mt-10 mb-4">
                                {/* Avatar with upload trigger */}
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => avatarInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={e => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files[0];
                                        if (file) handleAvatarFile(file);
                                    }}
                                >
                                    {displayAvatar ? (
                                        <img
                                            src={displayAvatar}
                                            alt={profile?.fullName || 'Avatar'}
                                            className={`w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg transition-all ${isDragging ? 'scale-105 ring-blue-400' : ''}`}
                                        />
                                    ) : (
                                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-lg transition-all ${isDragging ? 'scale-105 ring-blue-400' : ''}`}>
                                            {getInitials(profile?.fullName)}
                                        </div>
                                    )}
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        {isUploadingAvatar ? (
                                            <span className="material-symbols-outlined text-white text-xl animate-spin">progress_activity</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                                        )}
                                    </div>
                                </div>

                                {/* Role badge */}
                                {rc && (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${rc.bg} ${rc.color}`}>
                                        <span className="material-symbols-outlined text-[14px]">{rc.icon}</span>
                                        {rc.label}
                                    </span>
                                )}
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ''; }}
                            />

                            <h2 className="text-lg font-bold text-slate-800">{profile?.fullName || 'Chưa cập nhật'}</h2>
                            <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>

                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[17px]">photo_camera</span>
                                {isUploadingAvatar ? 'Đang tải lên...' : 'Thay đổi ảnh đại diện'}
                            </button>
                            <p className="text-[11px] text-slate-400 text-center mt-2">JPG, PNG, WebP · Tối đa 5MB</p>
                        </div>
                    </div>

                    {/* Account Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin tài khoản</h3>

                        {[
                            { icon: 'badge',          label: 'Mã người dùng', value: `#${profile?.id}` },
                            { icon: 'calendar_month', label: 'Ngày tham gia', value: formatDate(profile?.createdAt) },
                            { icon: 'shield',         label: 'Phân quyền',    value: rc?.label ?? '—' },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-slate-500 text-[16px]">{item.icon}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-slate-400 font-medium">{item.label}</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Session Info Card */}
                    <div className="bg-amber-50 rounded-2xl border border-amber-200/70 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-amber-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Phiên đăng nhập</h3>
                        </div>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            Phiên hiện tại được xác thực bằng <strong>JWT</strong>. Token tự động làm mới khi hết hạn. Đăng xuất để kết thúc phiên ngay lập tức.
                        </p>
                    </div>
                </div>

                {/* ── RIGHT: Forms ── */}
                <div className="space-y-6">

                    {/* ── Section 1: Personal Info ─────────────────────────────── */}
                    <SectionCard
                        title="Thông tin cá nhân"
                        subtitle="Cập nhật họ tên, số điện thoại và thông tin cơ bản của bạn."
                        icon="person_edit"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FieldInput
                                label="Họ và tên *"
                                id="fullName"
                                icon="person"
                                value={infoForm.fullName}
                                onChange={v => setInfoForm(f => ({ ...f, fullName: v }))}
                                placeholder="Nhập họ và tên đầy đủ"
                                error={infoErrors.fullName}
                            />
                            <FieldInput
                                label="Email"
                                id="email"
                                icon="mail"
                                value={profile?.email ?? ''}
                                disabled
                                hint="Email được quản lý bởi hệ thống, không thể thay đổi."
                            />
                            <FieldInput
                                label="Số điện thoại"
                                id="phone"
                                icon="phone"
                                type="tel"
                                value={infoForm.phone}
                                onChange={v => setInfoForm(f => ({ ...f, phone: v }))}
                                placeholder="VD: 0912 345 678"
                                error={infoErrors.phone}
                            />
                            <FieldInput label="Giới tính" id="gender" icon="wc">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">wc</span>
                                    <select
                                        id="gender"
                                        value={infoForm.gender}
                                        onChange={e => setInfoForm(f => ({ ...f, gender: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-800 outline-none appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="">Chưa chọn</option>
                                        <option value="male">Nam</option>
                                        <option value="female">Nữ</option>
                                        <option value="other">Khác</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
                                </div>
                            </FieldInput>
                            <FieldInput
                                label="Ngày sinh"
                                id="dob"
                                icon="cake"
                                type="date"
                                value={infoForm.dob}
                                onChange={v => setInfoForm(f => ({ ...f, dob: v }))}
                            />
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
                            <p className="text-xs text-slate-400">
                                {infoDirty ? (
                                    <span className="text-amber-600 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                        Có thay đổi chưa được lưu
                                    </span>
                                ) : (
                                    <span className="text-slate-400">Chưa có thay đổi nào</span>
                                )}
                            </p>
                            <button
                                onClick={handleSaveInfo}
                                disabled={isSavingInfo || !infoDirty}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {isSavingInfo ? (
                                    <span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[17px]">save</span>
                                )}
                                {isSavingInfo ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </SectionCard>

                    {/* ── Section 2: Change Password ───────────────────────────── */}
                    <SectionCard
                        title="Đổi mật khẩu"
                        subtitle="Sử dụng mật khẩu mạnh gồm chữ hoa, số và ký tự đặc biệt."
                        icon="lock_reset"
                    >
                        <div className="space-y-5">
                            {/* Current Password */}
                            <FieldInput label="Mật khẩu hiện tại *" id="currentPassword" error={pwErrors.currentPassword}>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">lock</span>
                                    <input
                                        id="currentPassword"
                                        type={showPw.current ? 'text' : 'password'}
                                        value={pwForm.currentPassword}
                                        onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                                        placeholder="Nhập mật khẩu hiện tại"
                                        autoComplete="current-password"
                                        className={`w-full bg-white border rounded-xl pl-11 pr-12 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${pwErrors.currentPassword ? 'border-red-400' : 'border-slate-200'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[19px]">{showPw.current ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                                {pwErrors.currentPassword && (
                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{pwErrors.currentPassword}</p>
                                )}
                            </FieldInput>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* New Password */}
                                <div>
                                    <FieldInput label="Mật khẩu mới *" id="newPassword" error={pwErrors.newPassword}>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">key</span>
                                            <input
                                                id="newPassword"
                                                type={showPw.new ? 'text' : 'password'}
                                                value={pwForm.newPassword}
                                                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                                                placeholder="Ít nhất 8 ký tự"
                                                autoComplete="new-password"
                                                className={`w-full bg-white border rounded-xl pl-11 pr-12 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${pwErrors.newPassword ? 'border-red-400' : 'border-slate-200'}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[19px]">{showPw.new ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                        {pwErrors.newPassword && (
                                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{pwErrors.newPassword}</p>
                                        )}
                                    </FieldInput>

                                    {/* Strength bar */}
                                    {pwForm.newPassword && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium">Độ mạnh: <span className="font-bold">{strength.label}</span></p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <FieldInput label="Xác nhận mật khẩu *" id="confirmPassword" error={pwErrors.confirmPassword}>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">key</span>
                                        <input
                                            id="confirmPassword"
                                            type={showPw.confirm ? 'text' : 'password'}
                                            value={pwForm.confirmPassword}
                                            onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                            placeholder="Nhập lại mật khẩu mới"
                                            autoComplete="new-password"
                                            className={`w-full bg-white border rounded-xl pl-11 pr-12 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${pwErrors.confirmPassword ? 'border-red-400' : pwForm.confirmPassword && pwForm.confirmPassword === pwForm.newPassword ? 'border-emerald-400' : 'border-slate-200'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[19px]">{showPw.confirm ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                        {pwForm.confirmPassword && pwForm.confirmPassword === pwForm.newPassword && (
                                            <span className="absolute right-10 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        )}
                                    </div>
                                    {pwErrors.confirmPassword && (
                                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{pwErrors.confirmPassword}</p>
                                    )}
                                </FieldInput>
                            </div>

                            {/* Password rules */}
                            <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100">
                                <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                                    Yêu cầu mật khẩu
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {[
                                        { rule: /^.{8,}$/, text: 'Tối thiểu 8 ký tự' },
                                        { rule: /[A-Z]/, text: 'Có ít nhất 1 chữ hoa' },
                                        { rule: /[0-9]/, text: 'Có ít nhất 1 số' },
                                        { rule: /[@$!%*?&]/, text: 'Có ký tự đặc biệt' },
                                    ].map(({ rule, text }) => {
                                        const passed = rule.test(pwForm.newPassword);
                                        return (
                                            <div key={text} className="flex items-center gap-1.5">
                                                <span className={`material-symbols-outlined text-[13px] ${pwForm.newPassword ? passed ? 'text-emerald-500' : 'text-slate-400' : 'text-slate-300'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                    {pwForm.newPassword && passed ? 'check_circle' : 'radio_button_unchecked'}
                                                </span>
                                                <span className={`text-[11px] font-medium ${pwForm.newPassword ? passed ? 'text-emerald-700' : 'text-slate-500' : 'text-slate-400'}`}>{text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6 pt-5 border-t border-slate-100">
                            <button
                                onClick={handleChangePassword}
                                disabled={isSavingPw || (!pwForm.currentPassword && !pwForm.newPassword && !pwForm.confirmPassword)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingPw ? (
                                    <span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[17px]">lock_reset</span>
                                )}
                                {isSavingPw ? 'Đang đổi...' : 'Đổi mật khẩu'}
                            </button>
                        </div>
                    </SectionCard>

                    {/* ── Section 3: Danger Zone ───────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-7 py-5 border-b border-red-100 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-red-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-red-700">Vùng nguy hiểm</h2>
                                <p className="text-sm text-red-400 mt-0.5">Các hành động sau không thể hoàn tác.</p>
                            </div>
                        </div>
                        <div className="px-7 py-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Đăng xuất tất cả thiết bị</p>
                                <p className="text-xs text-slate-500 mt-0.5">Kết thúc tất cả phiên đăng nhập hiện tại, ngoại trừ phiên này.</p>
                            </div>
                            <button
                                onClick={() => showToast('Tính năng này sẽ được triển khai trong phiên bản tới.', 'info')}
                                className="flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0"
                            >
                                <span className="material-symbols-outlined text-[17px]">logout</span>
                                Đăng xuất thiết bị khác
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Toast ── */}
            {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
        </main>
    );
}
