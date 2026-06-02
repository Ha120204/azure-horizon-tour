'use client';

import { useState } from 'react';
import { FieldInput } from './FieldInput';
import { SectionCard } from './SectionCard';
import type {
    AdminProfile,
    PasswordForm,
    PasswordStrength,
    PasswordVisibilityState,
    ProfileInfoForm,
} from '../_lib/types';

interface ProfileInfoFormSectionProps {
    profile: AdminProfile | null;
    infoForm: ProfileInfoForm;
    infoErrors: Record<string, string>;
    infoDirty: boolean;
    isSavingInfo: boolean;
    onChange: (patch: Partial<ProfileInfoForm>) => void;
    onSave: () => void;
}

export function ProfileInfoFormSection({
    profile,
    infoForm,
    infoErrors,
    infoDirty,
    isSavingInfo,
    onChange,
    onSave,
}: ProfileInfoFormSectionProps) {
    return (
        <SectionCard
            title="Thông tin cá nhân"
            subtitle="Cập nhật họ tên, số điện thoại và thông tin cơ bản của bạn."
            icon="person_edit"
        >
            {/* Grid 2 cột đồng đều cho tất cả fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FieldInput
                    label="Họ và tên *"
                    id="fullName"
                    icon="person"
                    value={infoForm.fullName}
                    onChange={value => onChange({ fullName: value })}
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
                    onChange={value => onChange({ phone: value })}
                    placeholder="VD: 0912 345 678"
                    error={infoErrors.phone}
                />
                {/* Giới tính – cùng cột với SĐT */}
                <FieldInput label="Giới tính" id="gender" icon="wc">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                            wc
                        </span>
                        <select
                            id="gender"
                            value={infoForm.gender}
                            onChange={event => onChange({ gender: event.target.value })}
                            className="w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-800 outline-none appearance-none transition-all cursor-pointer"
                        >
                            <option value="">Chưa chọn</option>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                            <option value="other">Khác</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                            expand_more
                        </span>
                    </div>
                </FieldInput>
                {/* Ngày sinh – chiếm 1 cột (không chiếm toàn bộ hàng) */}
                <FieldInput
                    label="Ngày sinh"
                    id="dob"
                    icon="cake"
                    type="date"
                    value={infoForm.dob}
                    onChange={value => onChange({ dob: value })}
                />
            </div>

            <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                    {infoDirty ? (
                        <span className="text-amber-600 flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Có thay đổi chưa được lưu
                        </span>
                    ) : (
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Đã đồng bộ
                        </span>
                    )}
                </p>
                <button
                    onClick={onSave}
                    disabled={isSavingInfo || !infoDirty}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all duration-150 shadow-sm shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
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
    );
}

interface PasswordFormSectionProps {
    pwForm: PasswordForm;
    showPw: PasswordVisibilityState;
    pwErrors: Record<string, string>;
    isSavingPw: boolean;
    strength: PasswordStrength;
    onChange: (patch: Partial<PasswordForm>) => void;
    onToggleVisibility: (field: keyof PasswordVisibilityState) => void;
    onChangePassword: () => void;
}

export function PasswordFormSection({
    pwForm,
    showPw,
    pwErrors,
    isSavingPw,
    strength,
    onChange,
    onToggleVisibility,
    onChangePassword,
}: PasswordFormSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasPwInput = Boolean(pwForm.currentPassword || pwForm.newPassword || pwForm.confirmPassword);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            {/* Header – clickable để collapse/expand */}
            <button
                type="button"
                onClick={() => setIsExpanded(v => !v)}
                className="w-full px-7 py-5 flex items-start gap-4 text-left hover:bg-slate-50/60 transition-colors duration-150 group"
            >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span
                        className="material-symbols-outlined text-blue-600 text-[20px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        lock_reset
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-bold text-slate-800">Đổi mật khẩu</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Sử dụng mật khẩu mạnh gồm chữ hoa, số và ký tự đặc biệt.
                    </p>
                </div>
                <div className="flex-shrink-0 mt-1">
                    <span
                        className={`material-symbols-outlined text-slate-400 text-[22px] transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                    >
                        expand_more
                    </span>
                </div>
            </button>

            {/* Collapsible body */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="border-t border-slate-100 px-7 py-6 space-y-5">
                    <PasswordField
                        label="Mật khẩu hiện tại *"
                        id="currentPassword"
                        icon="lock"
                        value={pwForm.currentPassword}
                        visible={showPw.current}
                        error={pwErrors.currentPassword}
                        autoComplete="current-password"
                        placeholder="Nhập mật khẩu hiện tại"
                        onChange={value => onChange({ currentPassword: value })}
                        onToggleVisibility={() => onToggleVisibility('current')}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <PasswordField
                                label="Mật khẩu mới *"
                                id="newPassword"
                                icon="key"
                                value={pwForm.newPassword}
                                visible={showPw.new}
                                error={pwErrors.newPassword}
                                autoComplete="new-password"
                                placeholder="Ít nhất 8 ký tự"
                                onChange={value => onChange({ newPassword: value })}
                                onToggleVisibility={() => onToggleVisibility('new')}
                            />

                            {pwForm.newPassword && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4, 5].map(index => (
                                            <div
                                                key={index}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                    index <= strength.score ? strength.color : 'bg-slate-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Độ mạnh:{' '}
                                        <span className="font-bold">{strength.label}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <PasswordField
                            label="Xác nhận mật khẩu *"
                            id="confirmPassword"
                            icon="key"
                            value={pwForm.confirmPassword}
                            visible={showPw.confirm}
                            error={pwErrors.confirmPassword}
                            autoComplete="new-password"
                            placeholder="Nhập lại mật khẩu mới"
                            valid={Boolean(
                                pwForm.confirmPassword && pwForm.confirmPassword === pwForm.newPassword
                            )}
                            onChange={value => onChange({ confirmPassword: value })}
                            onToggleVisibility={() => onToggleVisibility('confirm')}
                        />
                    </div>

                    <PasswordRules password={pwForm.newPassword} />

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button
                            onClick={onChangePassword}
                            disabled={isSavingPw || !hasPwInput}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 active:scale-95 transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {isSavingPw ? (
                                <span className="material-symbols-outlined text-[17px] animate-spin">
                                    progress_activity
                                </span>
                            ) : (
                                <span className="material-symbols-outlined text-[17px]">lock_reset</span>
                            )}
                            {isSavingPw ? 'Đang đổi...' : 'Đổi mật khẩu'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PasswordField({
    label,
    id,
    icon,
    value,
    visible,
    error,
    autoComplete,
    placeholder,
    valid = false,
    onChange,
    onToggleVisibility,
}: {
    label: string;
    id: string;
    icon: string;
    value: string;
    visible: boolean;
    error?: string;
    autoComplete: string;
    placeholder: string;
    valid?: boolean;
    onChange: (value: string) => void;
    onToggleVisibility: () => void;
}) {
    return (
        <FieldInput label={label} id={id} error={error}>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                    {icon}
                </span>
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={`w-full bg-white border rounded-xl pl-11 pr-12 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
                        error ? 'border-red-400 focus:ring-red-100' : valid ? 'border-emerald-400' : 'border-slate-200'
                    }`}
                />
                <button
                    type="button"
                    onClick={onToggleVisibility}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-[19px]">
                        {visible ? 'visibility_off' : 'visibility'}
                    </span>
                </button>
                {valid && (
                    <span
                        className="absolute right-10 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        check_circle
                    </span>
                )}
            </div>
        </FieldInput>
    );
}

function PasswordRules({ password }: { password: string }) {
    return (
        <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    info
                </span>
                Yêu cầu mật khẩu
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                    { rule: /^.{8,}$/, text: 'Tối thiểu 8 ký tự' },
                    { rule: /[A-Z]/, text: 'Có ít nhất 1 chữ hoa' },
                    { rule: /[0-9]/, text: 'Có ít nhất 1 số' },
                    { rule: /[@$!%*?&]/, text: 'Có ký tự đặc biệt' },
                ].map(({ rule, text }) => {
                    const passed = rule.test(password);
                    return (
                        <div key={text} className="flex items-center gap-1.5">
                            <span
                                className={`material-symbols-outlined text-[13px] ${
                                    password ? (passed ? 'text-emerald-500' : 'text-slate-400') : 'text-slate-300'
                                }`}
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                {password && passed ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span
                                className={`text-[11px] font-medium ${
                                    password ? (passed ? 'text-emerald-700' : 'text-slate-500') : 'text-slate-400'
                                }`}
                            >
                                {text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function DangerZone({ onUnavailableAction }: { onUnavailableAction: () => void }) {
    return (
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
            <div className="px-7 py-5 border-b border-red-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span
                        className="material-symbols-outlined text-red-500 text-[20px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        warning
                    </span>
                </div>
                <div>
                    <h2 className="text-[15px] font-bold text-red-700">Vùng nguy hiểm</h2>
                    <p className="text-sm text-red-400 mt-0.5">Các hành động sau không thể hoàn tác.</p>
                </div>
            </div>
            <div className="px-7 py-5 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-700">Đăng xuất tất cả thiết bị</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kết thúc tất cả phiên đăng nhập hiện tại, ngoại trừ phiên này.
                    </p>
                </div>
                <button
                    onClick={onUnavailableAction}
                    className="flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0"
                >
                    <span className="material-symbols-outlined text-[17px]">logout</span>
                    Đăng xuất thiết bị khác
                </button>
            </div>
        </div>
    );
}
