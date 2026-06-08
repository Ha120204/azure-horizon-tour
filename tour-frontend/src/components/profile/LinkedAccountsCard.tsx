'use client';

import { API_BASE_URL } from '@/lib/http/constants';

const GoogleLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

type Props = {
    authProvider?: string;
    email?: string;
};

export default function LinkedAccountsCard({ authProvider, email }: Props) {
    const isLinked = authProvider === 'google' || authProvider === 'both';

    const handleLink = () => {
        window.location.href = `${API_BASE_URL}/auth/google`;
    };

    return (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-outline-variant/10 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-outline">link</span>
                <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
                    Tài khoản liên kết
                </h3>
            </div>

            {/* Google row */}
            <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white border border-outline-variant/20 flex items-center justify-center shadow-sm flex-shrink-0">
                        <GoogleLogo />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">Google</p>
                        <p className="text-xs text-on-surface-variant truncate">
                            {isLinked ? email : 'Chưa liên kết'}
                        </p>
                    </div>
                </div>

                {isLinked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Đã liên kết
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={handleLink}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/10 active:scale-95 transition-all flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-[13px]">add_link</span>
                        Liên kết
                    </button>
                )}
            </div>
        </div>
    );
}
