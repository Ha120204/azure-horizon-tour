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

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="relative h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 30% 70%, white 1px, transparent 1px), radial-gradient(circle at 70% 20%, white 1px, transparent 1px)',
                            backgroundSize: '50px 50px, 35px 35px',
                        }}
                    />
                </div>

                <div className="px-6 pb-6">
                    <div className="flex justify-between items-end -mt-10 mb-4">
                        <div
                            className="relative group cursor-pointer"
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
                                    className={`h-20 w-20 rounded-2xl object-cover ring-4 ring-white shadow-lg transition-all ${isDragging ? 'scale-105 ring-blue-400' : ''}`}
                                />
                            ) : (
                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-lg transition-all ${isDragging ? 'scale-105 ring-blue-400' : ''}`}>
                                    {getInitials(profile?.fullName)}
                                </div>
                            )}
                            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {isUploadingAvatar ? (
                                    <span className="material-symbols-outlined text-white text-xl animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                                )}
                            </div>
                        </div>

                        {role && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${role.bg} ${role.color}`}>
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

                    <button
                        onClick={openAvatarPicker}
                        disabled={isUploadingAvatar}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[17px]">photo_camera</span>
                        {isUploadingAvatar ? 'Đang tải lên...' : 'Thay đổi ảnh đại diện'}
                    </button>
                    <p className="text-[11px] text-slate-400 text-center mt-2">JPG, PNG, WebP · Tối đa 5MB</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin tài khoản</h3>

                {[
                    { icon: 'badge', label: 'Mã người dùng', value: `#${profile?.id}` },
                    { icon: 'calendar_month', label: 'Ngày tham gia', value: formatDate(profile?.createdAt) },
                    { icon: 'shield', label: 'Phân quyền', value: role?.label ?? '—' },
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
    );
}
