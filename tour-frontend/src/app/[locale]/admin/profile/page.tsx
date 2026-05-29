'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { clearClientUserStorage } from '@/lib/authSession';
import { useAdminAutoRefresh } from '@/hooks/useAdminAutoRefresh';
import { DangerZone, PasswordFormSection, ProfileInfoFormSection } from './_components/ProfileForms';
import { ProfileIdentityPanel } from './_components/ProfileIdentityPanel';
import { Toast } from './_components/Toast';
import {
    formatDateToInputValue,
    getErrorMessage,
    getPasswordStrength,
} from './_lib/helpers';
import type {
    AdminProfile,
    PasswordForm,
    PasswordVisibilityState,
    ProfileInfoForm,
    ToastState,
} from './_lib/types';

export default function AdminProfilePage() {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState | null>(null);

    const [infoForm, setInfoForm] = useState<ProfileInfoForm>({ fullName: '', phone: '', dob: '', gender: '' });
    const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [infoDirty, setInfoDirty] = useState(false);

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [pwForm, setPwForm] = useState<PasswordForm>({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState<PasswordVisibilityState>({ current: false, new: false, confirm: false });
    const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
    const [isSavingPw, setIsSavingPw] = useState(false);

    const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchProfile = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setIsLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            const data: AdminProfile = json.data ?? json;

            setProfile(data);
            if (data.fullName) localStorage.setItem('userName', data.fullName);
            if (data.email) localStorage.setItem('userEmail', data.email);
            if (data.role) localStorage.setItem('userRole', data.role);
            if (data.avatarUrl) localStorage.setItem('userAvatarUrl', data.avatarUrl);
            else localStorage.removeItem('userAvatarUrl');
            setInfoForm({
                fullName: data.fullName || '',
                phone: data.phone || '',
                dob: formatDateToInputValue(data.dob),
                gender: data.gender || '',
            });
        } catch {
            if (options.silent) return;
            showToast('Không thể tải thông tin hồ sơ.', 'error');
        } finally {
            if (options.silent) return;
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useAdminAutoRefresh({
        intervalMs: 5 * 60 * 1000,
        pause: Boolean(infoDirty || isSavingInfo || isUploadingAvatar || isSavingPw || isDragging),
        onRefresh: () => fetchProfile({ silent: true }),
    });

    useEffect(() => {
        if (!profile) return;
        const isDiff =
            infoForm.fullName !== (profile.fullName || '') ||
            infoForm.phone !== (profile.phone || '') ||
            infoForm.dob !== formatDateToInputValue(profile.dob) ||
            infoForm.gender !== (profile.gender || '');
        setInfoDirty(isDiff);
    }, [infoForm, profile]);

    const handleSaveInfo = async () => {
        const errors: Record<string, string> = {};
        if (!infoForm.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
        if (infoForm.phone && !/^[0-9]{9,11}$/.test(infoForm.phone.replace(/\s/g, ''))) {
            errors.phone = 'Số điện thoại không hợp lệ (9-11 số)';
        }
        setInfoErrors(errors);
        if (Object.keys(errors).length) return;

        setIsSavingInfo(true);
        try {
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

            localStorage.setItem('userName', infoForm.fullName.trim());
            window.dispatchEvent(new Event('auth-change'));
            showToast('Cập nhật thông tin thành công!');
            fetchProfile();
        } catch (error: unknown) {
            const message = getErrorMessage(error, '');
            showToast(message || 'Lỗi lưu thông tin.', 'error');
        } finally {
            setIsSavingInfo(false);
        }
    };

    const handleAvatarFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ảnh không được lớn hơn 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = event => setAvatarPreview(event.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/avatar`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Upload thất bại');
            }

            const result = await res.json();
            const avatarUrl = result.data?.avatarUrl ?? result.avatarUrl;
            if (avatarUrl) {
                setAvatarPreview(avatarUrl);
                setProfile(prev => prev ? { ...prev, avatarUrl } : prev);
                localStorage.setItem('userAvatarUrl', avatarUrl);
                window.dispatchEvent(new Event('auth-change'));
            }
            showToast('Cập nhật ảnh đại diện thành công!');
            fetchProfile();
        } catch (error: unknown) {
            setAvatarPreview(null);
            const message = getErrorMessage(error, '');
            showToast(message || 'Upload ảnh thất bại.', 'error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleChangePassword = async () => {
        const errors: Record<string, string> = {};
        if (!pwForm.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
        if (!pwForm.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới';
        else if (pwForm.newPassword.length < 8) errors.newPassword = 'Mật khẩu mới tối thiểu 8 ký tự';
        else if (!/(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(pwForm.newPassword)) {
            errors.newPassword = 'Cần có chữ hoa, số và ký tự đặc biệt (@$!%*?&)';
        }
        if (!pwForm.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
        else if (pwForm.confirmPassword !== pwForm.newPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        if (pwForm.newPassword === pwForm.currentPassword && pwForm.newPassword) {
            errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
        }

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
            clearClientUserStorage();
            window.dispatchEvent(new Event('auth-change'));
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPwErrors({});
        } catch (error: unknown) {
            const msg = getErrorMessage(error, '');
            if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('invalid')) {
                setPwErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
            } else {
                showToast(msg || 'Đổi mật khẩu thất bại.', 'error');
            }
        } finally {
            setIsSavingPw(false);
        }
    };

    const strength = getPasswordStrength(pwForm.newPassword);
    const displayAvatar = avatarPreview ?? profile?.avatarUrl ?? null;

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

    return (
        <main className="flex-1 pt-8 px-8 pb-16 overflow-y-auto w-full max-w-[1200px] mx-auto">
            <div className="mb-8">
                <h1 className="text-[1.75rem] font-bold text-slate-800 leading-tight">Hồ sơ cá nhân</h1>
                <p className="text-slate-500 text-sm mt-1">Quản lý thông tin tài khoản và bảo mật đăng nhập của bạn.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
                <ProfileIdentityPanel
                    profile={profile}
                    displayAvatar={displayAvatar}
                    isDragging={isDragging}
                    isUploadingAvatar={isUploadingAvatar}
                    avatarInputRef={avatarInputRef}
                    onAvatarFile={handleAvatarFile}
                    onDraggingChange={setIsDragging}
                />

                <div className="space-y-6">
                    <ProfileInfoFormSection
                        profile={profile}
                        infoForm={infoForm}
                        infoErrors={infoErrors}
                        infoDirty={infoDirty}
                        isSavingInfo={isSavingInfo}
                        onChange={patch => setInfoForm(form => ({ ...form, ...patch }))}
                        onSave={handleSaveInfo}
                    />

                    <PasswordFormSection
                        pwForm={pwForm}
                        showPw={showPw}
                        pwErrors={pwErrors}
                        isSavingPw={isSavingPw}
                        strength={strength}
                        onChange={patch => setPwForm(form => ({ ...form, ...patch }))}
                        onToggleVisibility={field => setShowPw(value => ({ ...value, [field]: !value[field] }))}
                        onChangePassword={handleChangePassword}
                    />

                    <DangerZone
                        onUnavailableAction={() => showToast('Tính năng này sẽ được triển khai trong phiên bản tới.', 'info')}
                    />
                </div>
            </div>

            {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
        </main>
    );
}
