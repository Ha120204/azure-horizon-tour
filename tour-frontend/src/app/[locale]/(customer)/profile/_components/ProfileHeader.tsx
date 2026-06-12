'use client';

import Image from 'next/image';

interface ProfileHeaderProps {
    name: string;
    email: string;
    avatarUrl: string;
    isAvatarUploading: boolean;
    totalTrips: number;
    confirmedTrips: number;
    memberSinceLabel: string;
    onAvatarClick: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    t: (key: string) => string;
}

export default function ProfileHeader({
    name,
    email,
    avatarUrl,
    isAvatarUploading,
    totalTrips,
    confirmedTrips,
    memberSinceLabel,
    onAvatarClick,
    onFileChange,
    fileInputRef,
    t,
}: ProfileHeaderProps) {
    return (
        <section className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
            <div className="relative group">
                <div className={`w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-surface-container relative ${isAvatarUploading ? 'opacity-70' : ''}`}>
                    {avatarUrl ? (
                        <Image alt={name} className="object-cover" src={avatarUrl} fill sizes="(min-width: 768px) 176px, 128px" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-5xl">
                            {name ? name.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                    {isAvatarUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="material-symbols-outlined text-white animate-spin text-4xl">progress_activity</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={onAvatarClick}
                    type="button"
                    disabled={isAvatarUploading}
                    aria-label={t('profile.changeAvatar') || 'Thay ảnh đại diện'}
                    className={`group absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-[transform,background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none ${isAvatarUploading ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-1 hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/20 active:translate-y-0 active:scale-95'}`}
                >
                    <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none">photo_camera</span>
                </button>

                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" hidden />
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                        <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">{name}</h1>
                        <span className="px-3 py-1 bg-secondary-container/10 text-on-secondary-container text-[10px] font-bold tracking-widest uppercase rounded-full border border-secondary-container/20">{memberSinceLabel}</span>
                    </div>
                    <p className="text-on-surface-variant font-body">{email}</p>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-headline text-primary">{totalTrips}</span>
                        <span className="text-xs uppercase tracking-wider text-outline font-label">{t('profile.totalTripsLbl')}</span>
                    </div>
                    <div className="w-px h-8 bg-outline-variant/30 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-headline text-secondary">{confirmedTrips}</span>
                        <span className="text-xs uppercase tracking-wider text-outline font-label">{t('profile.confirmedTripsLbl')}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
