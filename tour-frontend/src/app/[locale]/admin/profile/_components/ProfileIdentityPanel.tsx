import type { RefObject } from 'react';
import Image from 'next/image';
import { roleConfig } from '../_lib/config';
import { formatDate, getInitials } from '../_lib/helpers';
import type { AdminProfile } from '../_lib/types';

interface ProfileIdentityPanelProps {
    profile: AdminProfile | null;
    displayAvatar: string | null;
    isDragging: boolean;
    isUploadingAvatar: boolean;
    avatarInputRef: RefObject<HTMLInputElement | null>;
    onAvatarFile: (file: File) => void;
    onDraggingChange: (isDragging: boolean) => void;
}

export function ProfileIdentityPanel({
    profile,
    displayAvatar,
    isDragging,
    isUploadingAvatar,
    avatarInputRef,
    onAvatarFile,
    onDraggingChange,
}: ProfileIdentityPanelProps) {
    const role = profile ? (roleConfig[profile.role] ?? roleConfig.STAFF) : null;

    const openAvatarPicker = () => avatarInputRef.current?.click();

    // Lấy thời gian đăng nhập từ localStorage (được set lúc login)
    const lastLoginRaw = typeof window !== 'undefined' ? localStorage.getItem('lastLoginAt') : null;
    const lastLoginLabel = lastLoginRaw
        ? new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          }).format(new Date(lastLoginRaw))
        : 'Phiên hiện tại';

    return (
        <div className="space-y-4">
            {/* ── Avatar Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {/* Cover banner */}
                <div className="relative h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 30% 70%, white 1px, transparent 1px), radial-gradient(circle at 70% 20%, white 1px, transparent 1px)',
                            backgroundSize: '50px 50px, 35px 35px',
                        }}
                    />
                </div>

                <div className="px-6 pb-6">
                    <div className="flex justify-between items-end -mt-10 mb-4">
                        {/* Avatar – hover overlay rõ ràng */}
                        <div
                            className="relative group cursor-pointer"
                            title="Click để thay đổi ảnh đại diện"
                            onClick={openAvatarPicker}
                            onDragOver={event => {
                                event.preventDefault();
                                onDraggingChange(true);
                            }}
                            onDragLeave={() => onDraggingChange(false)}
                            onDrop={event => {
                                event.preventDefault();
                                onDraggingChange(false);
                                const file = event.dataTransfer.files[0];
                                if (file) onAvatarFile(file);
                            }}
                        >
                            {displayAvatar ? (
                                <Image
                                    src={displayAvatar}
                                    alt={profile?.fullName || 'Avatar'}
                                    width={80}
                                    height={80}
                                    sizes="80px"
                                    className={`h-20 w-20 rounded-2xl object-cover ring-4 ring-white shadow-lg transition-all duration-200 ${
                                        isDragging ? 'scale-110 ring-blue-400' : 'group-hover:scale-105'
                                    }`}
                                />
                            ) : (
                                <div
                                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-lg transition-all duration-200 ${
                                        isDragging ? 'scale-110 ring-blue-400' : 'group-hover:scale-105'
                                    }`}
                                >
                                    {getInitials(profile?.fullName)}
                                </div>
                            )}
                            {/* Camera overlay – luôn hiện nhẹ, rõ khi hover */}
                            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-0.5">
                                    {isUploadingAvatar ? (
                                        <span className="material-symbols-outlined text-white text-xl animate-spin">
                                            progress_activity
                                        </span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-white text-xl">
                                                photo_camera
                                            </span>
                                            <span className="text-white text-[9px] font-bold tracking-wide">
                                                ĐỔI ẢNH
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Role badge */}
                        {role && (
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${role.bg} ${role.color}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">{role.icon}</span>
                                {role.label}
                            </span>
                        )}
                    </div>

                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={event => {
                            const file = event.target.files?.[0];
                            if (file) onAvatarFile(file);
                            event.target.value = '';
                        }}
                    />

                    <h2 className="text-lg font-bold text-slate-800">{profile?.fullName || 'Chưa cập nhật'}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>

                    {/* Upload button */}
                    <button
                        onClick={openAvatarPicker}
                        disabled={isUploadingAvatar}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[17px]">photo_camera</span>
                        {isUploadingAvatar ? 'Đang tải lên...' : 'Thay đổi ảnh đại diện'}
                    </button>
                    <p className="text-[11px] text-slate-400 text-center mt-2">JPG, PNG, WebP · Tối đa 5MB</p>
                </div>
            </div>

            {/* ── Account Info Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin tài khoản</h3>

                {[
                    { icon: 'badge', label: 'Mã người dùng', value: `#${profile?.id}` },
                    { icon: 'calendar_month', label: 'Ngày tham gia', value: formatDate(profile?.createdAt) },
                    { icon: 'shield', label: 'Phân quyền', value: role?.label ?? '—' },
                    { icon: 'history', label: 'Đăng nhập lần cuối', value: lastLoginLabel },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-slate-400 text-[16px]">{item.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-slate-400 font-medium">{item.label}</p>
                            <p className="text-sm font-semibold text-slate-700 truncate">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>


        </div>
    );
}
