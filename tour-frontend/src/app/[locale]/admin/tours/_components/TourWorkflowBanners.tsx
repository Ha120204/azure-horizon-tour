'use client';

interface PendingReviewBannerProps {
    pendingCount: number;
    onViewPending: () => void;
}

export function PendingReviewBanner({ pendingCount, onViewPending }: PendingReviewBannerProps) {
    if (pendingCount <= 0) return null;

    return (
        <div className="mb-4 flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-300/50 rounded-2xl">
            <span className="material-symbols-outlined text-amber-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
            <span className="text-sm font-semibold text-amber-800 flex-1">
                Có <strong>{pendingCount}</strong> tour đang chờ bạn duyệt.
            </span>
            <button
                onClick={onViewPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                Xem ngay
            </button>
        </div>
    );
}

interface StaffDraftBannerProps {
    draftCount: number;
}

export function StaffDraftBanner({ draftCount }: StaffDraftBannerProps) {
    if (draftCount <= 0) return null;

    return (
        <div className="mb-4 flex items-start gap-3 px-5 py-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <div>
                <p className="text-sm font-semibold text-on-surface">Bạn có bản nháp chưa gửi duyệt</p>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    Tour ở trạng thái <span className="font-semibold text-on-surface">Bản Nháp</span> có thể chỉnh sửa tự do. Khi đã hoàn thiện, nhấn <span className="font-semibold text-amber-600">Gửi Duyệt</span> để chuyển cho Admin kiểm tra và phê duyệt.
                </p>
            </div>
        </div>
    );
}
