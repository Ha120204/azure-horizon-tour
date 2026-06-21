'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDate, getTourStatusBadge } from '../_lib/helpers';
import type { Tour } from '../_lib/types';

type ReviewAction = 'approve' | 'reject';

interface ActiveTourRowProps {
    tour: Tour;
    rowIndex: number;
    page: number;
    pageSize: number;
    isChecked: boolean;
    userId: number | null;
    isStaff: boolean;
    isAdmin: boolean;
    submittingTourId: number | null;
    togglingFeaturedId: number | null;
    isFeaturedSuggested: boolean;
    onToggleFeatured: (tour: Tour) => void;
    canSelectTour: (tour: Tour) => boolean;
    onToggleSelect: (id: number) => void;
    onOpenDetail: (tour: Tour) => void;
    onOpenContent: (tour: Tour) => void;
    onEdit: (tour: Tour) => void;
    onSubmit: (tour: Tour) => void;
    onReview: (target: { tour: Tour; action: ReviewAction }) => void;
    onDelete: (tour: Tour) => void;
}

export function ActiveTourRow({
    tour,
    rowIndex,
    page,
    pageSize,
    isChecked,
    userId,
    isStaff,
    isAdmin,
    submittingTourId,
    togglingFeaturedId,
    isFeaturedSuggested,
    onToggleFeatured,
    canSelectTour,
    onToggleSelect,
    onOpenDetail,
    onOpenContent,
    onEdit,
    onSubmit,
    onReview,
    onDelete,
}: ActiveTourRowProps) {
    const { locale } = useParams<{ locale: string }>();
    const tourStatusBadge = getTourStatusBadge(tour.status ?? 'PUBLISHED');
    const isMyTour = tour.createdById === userId;
    const canStaffEdit = isStaff && isMyTour && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
    const canStaffSubmit = isStaff && isMyTour && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
    const canStaffDeleteDraft = isStaff && isMyTour && (tour.status === 'DRAFT' || tour.status === 'REJECTED');
    const canAdminReview = isAdmin && tour.status === 'PENDING_REVIEW';
    const canSelect = canSelectTour(tour);
    const bulkSelectHint = canSelect ? `Chọn tour ${tour.name}` : 'Bạn không có quyền chọn tour này';
    const stt = (page - 1) * pageSize + rowIndex + 1;
    const canToggleFeatured = isAdmin && tour.status === 'PUBLISHED';
    const isTogglingFeatured = togglingFeaturedId === tour.id;

    return (
        <tr className={`hover:bg-surface-container-low/40 transition-colors group ${isChecked ? 'bg-primary/5' : ''}`}>
            <td className="py-3 pl-5 pr-2">
                <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!canSelect}
                    onChange={() => onToggleSelect(tour.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={bulkSelectHint}
                    title={bulkSelectHint}
                />
            </td>
            <td className="py-3 px-3 text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container text-xs font-bold text-on-surface-variant">
                    {stt}
                </span>
            </td>
            <td className="py-3 px-5">
                <button
                    type="button"
                    onClick={() => onOpenDetail(tour)}
                    className="group/tour flex min-w-0 items-center gap-3 rounded-xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    title={`Xem chi tiết tour ${tour.name}`}
                >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container shrink-0">
                        {tour.imageUrl ? (
                            <Image
                                src={tour.imageUrl}
                                alt={tour.name}
                                width={56}
                                height={56}
                                sizes="56px"
                                loading="lazy"
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline">
                                <span className="material-symbols-outlined" aria-hidden="true">image</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-on-surface line-clamp-2 max-w-[260px] group-hover/tour:text-primary" title={tour.name}>{tour.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            <span translate="no" className="font-mono">#{tour.id}</span>
                            {' · '}
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-medium">{tour.tourType || 'Tour'}</span>
                        </p>
                    </div>
                </button>
            </td>
            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">{tour.destination?.name ?? '—'}</td>
            <td className="py-3 px-5 whitespace-nowrap">
                <span className="text-sm font-semibold text-on-surface">{formatCurrency(tour.price)}</span>
            </td>
            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">{tour.startDate ? formatDate(tour.startDate) : '—'}</td>
            <td className="py-3 px-5 text-sm text-on-surface-variant whitespace-nowrap">{tour.duration ?? '—'}</td>
            <td className="py-3 px-5 whitespace-nowrap">
                {(() => {
                    const booked = tour.bookedSeats ?? 0;
                    const total = tour.totalSeats ?? tour.availableSeats;
                    const fillRate = total > 0 ? (booked / total) : 0;
                    const seatsColor = fillRate >= 0.95
                        ? 'text-error font-bold'
                        : fillRate >= 0.80
                            ? 'text-amber-600 font-semibold'
                            : 'text-on-surface font-semibold';
                    return (
                        <div>
                            <p className={`text-sm ${seatsColor}`}>Còn {tour.availableSeats.toLocaleString('vi-VN')}</p>
                            {booked > 0 && (
                                <p className="text-[11px] text-on-surface-variant mt-0.5">{booked.toLocaleString('vi-VN')}/{total.toLocaleString('vi-VN')} đã đặt</p>
                            )}
                        </div>
                    );
                })()}
            </td>
            <td className="py-3 px-5 whitespace-nowrap">
                {tour.averageRating > 0 ? (
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">star</span>
                        <span className="text-sm font-semibold text-on-surface">{tour.averageRating.toFixed(1)}</span>
                    </div>
                ) : (
                    <span className="text-xs text-on-surface-variant">Chưa có</span>
                )}
            </td>
            <td className="py-3 px-5 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${tourStatusBadge.cls}`}>
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{tourStatusBadge.icon}</span>
                        {tourStatusBadge.label}
                    </span>
                    {tour.status === 'REJECTED' && tour.reviewNote && (
                        <p
                            className="text-[10px] text-error font-medium mt-1 max-w-[160px] leading-tight cursor-help"
                            title={tour.reviewNote}
                        >
                            ↳ {tour.reviewNote.length > 60
                                ? tour.reviewNote.slice(0, 60) + '…'
                                : tour.reviewNote}
                        </p>
                    )}
                </div>
            </td>
            <td className="py-3 px-5 text-center whitespace-nowrap">
                {canToggleFeatured ? (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            role="switch"
                            onClick={() => onToggleFeatured(tour)}
                            disabled={isTogglingFeatured}
                            aria-checked={tour.isFeatured ?? false}
                            aria-label={tour.isFeatured ? `Tắt nổi bật tour ${tour.name}` : `Bật nổi bật tour ${tour.name}`}
                            title={tour.isFeatured ? 'Đang nổi bật trên trang chủ — bấm để tắt' : 'Bấm để đưa lên mục nổi bật trang chủ'}
                            className="inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${tour.isFeatured ? 'bg-amber-500' : 'bg-outline-variant/50'}`}>
                                <span className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white shadow transition-transform ${tour.isFeatured ? 'translate-x-[18px]' : 'translate-x-0.5'}`}>
                                    {isTogglingFeatured && (
                                        <span className="material-symbols-outlined text-[12px] text-amber-600 animate-spin">progress_activity</span>
                                    )}
                                </span>
                            </span>
                            {tour.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700">
                                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    Nổi bật
                                </span>
                            )}
                        </button>
                        {!tour.isFeatured && isFeaturedSuggested && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600" title="Đang bán chạy / đánh giá tốt — nên cân nhắc bật nổi bật">
                                <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
                                Gợi ý
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-on-surface-variant">—</span>
                )}
            </td>
            <td className="py-3 px-5 text-right whitespace-nowrap">
                <div className="flex justify-end gap-1">
                    <div className="relative group/tip">
                        <button onClick={() => onOpenDetail(tour)} aria-label={`Xem chi tiết tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Xem chi tiết<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                    </div>
                    {tour.status === 'PUBLISHED' && (
                        <div className="relative group/tip">
                            <button onClick={() => window.open(`${locale !== 'vi' ? `/${locale}` : ''}/tour/${tour.id}`, '_blank')} aria-label={`Xem tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 right-0 z-[120] whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100">Xem trang khách<span className="absolute right-3 top-full border-4 border-transparent border-t-on-surface" /></span>
                        </div>
                    )}
                    {isAdmin && tour.status === 'PUBLISHED' && (
                        <div className="relative group/tip">
                            <button onClick={() => onOpenContent(tour)} aria-label={`Quản lý nội dung tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-violet-500/10 hover:text-violet-600 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Nội dung<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                        </div>
                    )}
                    {((isAdmin && tour.status !== 'COMPLETED') || canStaffEdit) && (
                        <div className="relative group/tip">
                            <button onClick={() => onEdit(tour)} aria-label={`Chỉnh sửa tour ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Chỉnh sửa<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-on-surface" /></span>
                        </div>
                    )}
                    {canStaffSubmit && (
                        <button
                            onClick={() => onSubmit(tour)}
                            disabled={submittingTourId === tour.id}
                            aria-label={`Gửi duyệt tour ${tour.name}`}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-300/40 text-xs font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                            {submittingTourId === tour.id
                                ? <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-[13px]">send</span>
                            }
                            Gửi Duyệt
                        </button>
                    )}
                    {canAdminReview && (<>
                        <div className="relative group/tip">
                            <button
                                onClick={() => onReview({ tour, action: 'approve' })}
                                aria-label={`Duyệt tour ${tour.name}`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
                            >
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Duyệt<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-emerald-700" /></span>
                        </div>
                        <div className="relative group/tip">
                            <button
                                onClick={() => onReview({ tour, action: 'reject' })}
                                aria-label={`Từ chối tour ${tour.name}`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error outline-none"
                            >
                                <span className="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">Từ chối<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                        </div>
                    </>)}
                    {(isAdmin || canStaffDeleteDraft) && (
                        <div className="relative group/tip">
                            <button onClick={() => onDelete(tour)} aria-label={`${canStaffDeleteDraft ? 'Xóa bản nháp' : 'Xóa tour'} ${tour.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors focus-visible:ring-2 focus-visible:ring-error outline-none">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-error px-2 py-1 text-[10px] font-medium text-on-error opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 z-20">{canStaffDeleteDraft ? 'Xóa bản nháp' : 'Xóa tour'}<span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-error" /></span>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
