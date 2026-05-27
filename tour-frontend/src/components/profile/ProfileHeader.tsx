'use client';

import Image from 'next/image';

interface ProfileHeaderProps {
    name: string;
    email: string;
    avatarUrl: string;
    isAvatarUploading: boolean;
    totalTrips: number;
    confirmedTrips: number;
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
    onAvatarClick,
    onFileChange,
    fileInputRef,
    t,
}: ProfileHeaderProps) {
    return (
        <section className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-surface-container-lowest p-8 rounded-xl ambient-shadow">
            <div className="relative group">
                <div className={`w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-surface-container relative ${isAvatarUploading ? 'opacity-70' : ''}`}>
                    <Image alt={name} className="object-cover" src={avatarUrl} fill sizes="(min-width: 768px) 176px, 128px" />
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
                    className={`absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg text-primary hover:bg-primary-fixed transition-colors ${isAvatarUploading ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
                >
                    <span className="material-symbols-outlined text-xl">photo_camera</span>
                </button>

                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" hidden />
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                        <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">{name}</h1>
                        <span className="px-3 py-1 bg-secondary-container/10 text-on-secondary-container text-[10px] font-bold tracking-widest uppercase rounded-full border border-secondary-container/20">{t('profile.memberSince')}</span>
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
