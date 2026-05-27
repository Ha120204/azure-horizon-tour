'use client';

import Image from 'next/image';
import type { TrashedTour } from '../_lib/types';

const formatDeletedAt = (date: string) =>
    new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));

interface TrashTourRowProps {
    tour: TrashedTour;
    isChecked: boolean;
    restoringTourId: number | null;
    onToggleSelect: (id: number) => void;
    onRestore: (tour: TrashedTour) => void;
    onPermanentDelete: (tour: TrashedTour) => void;
}

export function TrashTourRow({
    tour,
    isChecked,
    restoringTourId,
    onToggleSelect,
    onRestore,
    onPermanentDelete,
}: TrashTourRowProps) {
    const bookingCount = tour.bookingCount ?? 0;
    const canPermanentDelete = tour.canPermanentDelete ?? bookingCount === 0;

    return (
        <tr className={`hover:bg-error/5 transition-colors ${isChecked ? 'bg-error/5' : ''}`}>
            <td className="py-3 pl-5 pr-2">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelect(tour.id)}
                    className="w-4 h-4 rounded border-outline-variant accent-error cursor-pointer"
                    aria-label={`Chọn tour ${tour.name}`}
                />
            </td>
            <td className="py-3 px-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container shrink-0 opacity-60">
                        {tour.imageUrl
                            ? <Image src={tour.imageUrl} alt={tour.name} width={48} height={48} sizes="48px" className="h-full w-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-outline">image</span></div>
                        }
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-on-surface/70 line-through">{tour.name}</p>
                        <p className="text-xs text-on-surface-variant">#{tour.id}</p>
                    </div>
                </div>
            </td>
            <td className="py-3 px-5 text-sm text-on-surface-variant">{tour.destination?.name ?? '—'}</td>
            <td className="py-3 px-5 text-sm text-on-surface-variant">{tour.createdBy?.fullName ?? '—'}</td>
            <td className="py-3 px-5">
                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${bookingCount > 0 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                    <span className="material-symbols-outlined text-[13px]">{bookingCount > 0 ? 'lock' : 'delete_forever'}</span>
                    {bookingCount > 0 ? `${bookingCount} booking` : 'Có thể xóa'}
                </span>
            </td>
            <td className="py-3 px-5 text-sm text-on-surface-variant">
                {tour.deletedAt ? formatDeletedAt(tour.deletedAt) : '—'}
            </td>
            <td className="py-3 px-5 text-right">
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onRestore(tour)}
                        disabled={restoringTourId === tour.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                        {restoringTourId === tour.id
                            ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            : <span className="material-symbols-outlined text-[14px]">restore</span>
                        }
                        Khôi phục
                    </button>
                    <button
                        onClick={() => {
                            if (canPermanentDelete) onPermanentDelete(tour);
                        }}
                        disabled={!canPermanentDelete}
                        title={canPermanentDelete ? 'Xóa vĩnh viễn' : 'Tour đã có booking, chỉ được lưu trữ'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${canPermanentDelete
                                ? 'bg-error/10 text-error hover:bg-error/20'
                                : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[14px]">{canPermanentDelete ? 'delete_forever' : 'lock'}</span>
                        {canPermanentDelete ? 'Xóa vĩnh viễn' : 'Không thể xóa'}
                    </button>
                </div>
            </td>
        </tr>
    );
}
