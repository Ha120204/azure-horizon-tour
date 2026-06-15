'use client';

import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { formatCurrency, formatDate, getTourStatusBadge } from '../_lib/helpers';
import type { Tour, TourDeparture, TourItineraryDay, TourPackage } from '../_lib/types';

interface TourReferenceDrawerProps {
    tour: Tour;
    isStaff: boolean;
    isLoading: boolean;
    onClose: () => void;
    onCreateDraft: () => void;
}

interface SectionProps {
    icon: string;
    title: string;
    subtitle?: string;
    children: ReactNode;
}

interface CompletionItem {
    label: string;
    passed: boolean;
    hint: string;
}

const EMPTY_VALUE = 'Chưa cập nhật';

const formatDateSafe = (value?: string | null) => {
    if (!value) return EMPTY_VALUE;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
    return formatDate(value);
};

const toTextList = (value?: string[] | string | null): string[] => {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean);
    } catch {
        // Plain newline/comma separated text is handled below.
    }
    return trimmed
        .split(/\r?\n|,/)
        .map(item => item.trim())
        .filter(Boolean);
};

function DetailSection({ icon, title, subtitle, children }: SectionProps) {
    return (
        <section className="rounded-2xl border border-outline-variant/15 bg-surface px-5 py-4 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{icon}</span>
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-on-surface">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-xs font-medium text-on-surface-variant">{subtitle}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

function EmptyBlock({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low/40 px-4 py-6 text-center text-sm font-medium text-on-surface-variant">
            {label}
        </div>
    );
}

function MetricTile({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-outline-variant/15 bg-surface px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-bold text-on-surface">{value}</p>
        </div>
    );
}

function CompletionRow({ item }: { item: CompletionItem }) {
    return (
        <li className="flex items-start gap-3 rounded-xl bg-surface px-3 py-3">
            <span
                className={`material-symbols-outlined mt-0.5 text-[18px] ${item.passed ? 'text-emerald-600' : 'text-amber-600'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
            >
                {item.passed ? 'check_circle' : 'error'}
            </span>
            <div>
                <p className="text-xs font-bold text-on-surface">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-on-surface-variant">{item.hint}</p>
            </div>
        </li>
    );
}

function PackagePreview({ pkg }: { pkg: TourPackage }) {
    const includes = toTextList(pkg.includes);
    const excludes = toTextList(pkg.excludes);

    return (
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-on-surface">{pkg.name}</p>
                    {pkg.description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{pkg.description}</p>}
                </div>
                <div className="text-right">
                    <p className="text-sm font-extrabold text-primary">
                        {Number(pkg.price) > 0 ? `+ ${formatCurrency(Number(pkg.price))}` : 'Đã gồm trong giá'}
                    </p>
                    {pkg.badge && <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">{pkg.badge}</p>}
                </div>
            </div>
            {(includes.length > 0 || excludes.length > 0) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {includes.length > 0 && (
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Bao gồm</p>
                            <ul className="space-y-1.5">
                                {includes.slice(0, 5).map((item, index) => (
                                    <li key={`include-${pkg.id}-${index}-${item}`} className="flex items-start gap-2 text-xs leading-5 text-on-surface-variant">
                                        <span className="material-symbols-outlined mt-0.5 text-[13px] text-emerald-600" aria-hidden="true">done</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {excludes.length > 0 && (
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-error">Không gồm</p>
                            <ul className="space-y-1.5">
                                {excludes.slice(0, 5).map((item, index) => (
                                    <li key={`exclude-${pkg.id}-${index}-${item}`} className="flex items-start gap-2 text-xs leading-5 text-on-surface-variant">
                                        <span className="material-symbols-outlined mt-0.5 text-[13px] text-error" aria-hidden="true">close</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DeparturePreview({ departure }: { departure: TourDeparture }) {
    return (
        <li className="grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-surface-container-low/50 px-4 py-3">
            <div>
                <p className="text-sm font-bold text-on-surface">{formatDateSafe(departure.departureDate)}</p>
                {departure.note && <p className="mt-0.5 text-xs text-on-surface-variant">{departure.note}</p>}
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-primary">{formatCurrency(Number(departure.price ?? 0))}</p>
                <p className="mt-0.5 text-[11px] font-medium text-on-surface-variant">{departure.availableSeats} ghế</p>
            </div>
        </li>
    );
}

function ItineraryDayPreview({ day, isFirst }: { day: TourItineraryDay; isFirst: boolean }) {
    const activities = Array.isArray(day.activities) ? day.activities.filter(Boolean) : [];
    const timeline = Array.isArray(day.timeline) ? day.timeline.filter(item => item.time && item.activity) : [];

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isFirst ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}>
                    {day.dayNumber}
                </div>
                <div className="mt-2 min-h-8 w-px flex-1 bg-outline-variant/30" />
            </div>
            <div className="min-w-0 flex-1 pb-5">
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low/40 p-4">
                    <h4 className="text-sm font-bold text-on-surface">{day.title || `Ngày ${day.dayNumber}`}</h4>
                    {day.description && <p className="mt-2 whitespace-pre-line text-xs leading-6 text-on-surface-variant">{day.description}</p>}
                    {timeline.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-outline-variant/15 pt-3">
                            {timeline.slice(0, 4).map((item, index) => (
                                <div key={`timeline-${day.id}-${index}-${item.time}-${item.activity}`} className="flex gap-3 text-xs leading-5">
                                    <span className="w-12 shrink-0 font-bold text-primary">{item.time}</span>
                                    <span className="text-on-surface-variant">{item.activity}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {activities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {activities.slice(0, 6).map((activity, index) => (
                                <span key={`activity-${day.id}-${index}-${activity}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                    {activity}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function TourReferenceDrawer({ tour, isStaff, isLoading, onClose, onCreateDraft }: TourReferenceDrawerProps) {
    const statusBadge = getTourStatusBadge(tour.status ?? 'PUBLISHED');
    const highlights = tour.highlights ?? [];
    const packages = tour.packages ?? [];
    const departures = tour.departures ?? [];
    const itinerary = tour.itinerary ?? [];
    const faqs = tour.faqs ?? [];
    const galleryImages = tour.images?.filter(image => image.url) ?? [];
    const previewImageUrls = [tour.imageUrl, ...galleryImages.map(image => image.url)].filter((url): url is string => Boolean(url));

    const completionItems = useMemo<CompletionItem[]>(() => ([
        {
            label: 'Thông tin nền tảng',
            passed: Boolean(tour.name && tour.destination?.name && tour.duration && Number(tour.price) > 0 && tour.imageUrl),
            hint: 'Tên, điểm đến, ảnh chính, thời lượng và giá phải rõ ngay từ đầu.',
        },
        {
            label: 'Nội dung bán hàng',
            passed: Boolean(tour.description?.trim() && highlights.length >= 3),
            hint: 'Mô tả nên trả lời vì sao khách nên chọn tour này, kèm 3-7 điểm nổi bật.',
        },
        {
            label: 'Lịch trình',
            passed: itinerary.length > 0,
            hint: 'Tour hoàn chỉnh nên có từng ngày, hoạt động chính, bữa ăn, khách sạn hoặc phương tiện.',
        },
        {
            label: 'Gói và khởi hành',
            passed: packages.length > 0 || departures.length > 0,
            hint: 'Gói dịch vụ và ngày khởi hành giúp admin kiểm tra khả năng bán thực tế.',
        },
        {
            label: 'Câu hỏi thường gặp',
            passed: faqs.length > 0,
            hint: 'FAQ giúp giảm câu hỏi lặp lại từ khách trước khi đặt tour.',
        },
    ]), [departures.length, faqs.length, highlights.length, itinerary.length, packages.length, tour.description, tour.destination?.name, tour.duration, tour.imageUrl, tour.name, tour.price]);

    const completedCount = completionItems.filter(item => item.passed).length;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tour-reference-title">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
            <aside className="relative z-[1] flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 sm:max-h-[calc(100vh-3rem)]">
                <div className="relative h-56 shrink-0 overflow-hidden bg-surface-container sm:h-64">
                    {tour.imageUrl ? (
                        <Image
                            src={tour.imageUrl}
                            alt={tour.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 960px"
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-6xl" aria-hidden="true">travel_explore</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white outline-none"
                        aria-label="Đóng chi tiết tour"
                    >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${statusBadge.cls}`}>
                                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{statusBadge.icon}</span>
                                {statusBadge.label}
                            </span>
                            <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
                                {isStaff ? 'Bản mẫu tham khảo' : 'Chi tiết vận hành'}
                            </span>
                        </div>
                        <h2 id="tour-reference-title" className="max-w-4xl text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                            {tour.name}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm font-medium text-white/80">
                            {tour.destination?.name ?? EMPTY_VALUE} · {tour.tourType || 'Tour'} · #{tour.id}
                        </p>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-low/45">
                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-7">
                        <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <MetricTile icon="payments" label="Giá từ" value={formatCurrency(Number(tour.price ?? 0))} />
                                <MetricTile icon="calendar_month" label="Ngày khởi hành" value={formatDateSafe(tour.startDate)} />
                                <MetricTile icon="schedule" label="Thời lượng" value={tour.duration || EMPTY_VALUE} />
                                <MetricTile icon="airline_seat_recline_normal" label="Ghế còn" value={`${tour.availableSeats ?? 0} ghế`} />
                            </div>

                            {isLoading && (
                                <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                                    <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
                                    Đang tải cấu trúc chi tiết của tour...
                                </div>
                            )}

                            <DetailSection icon="notes" title="Mô tả bán hàng" subtitle="Đây là phần staff nên đọc kỹ để hiểu cách tour hoàn chỉnh thuyết phục khách.">
                                {tour.description ? (
                                    <p className="whitespace-pre-line text-sm leading-7 text-on-surface-variant">{tour.description}</p>
                                ) : (
                                    <EmptyBlock label="Tour này chưa có mô tả chi tiết." />
                                )}
                            </DetailSection>

                            <DetailSection icon="auto_awesome" title="Điểm nổi bật" subtitle="Các ý ngắn, dễ quét, thường xuất hiện ngay đầu trang chi tiết khách hàng.">
                                {highlights.length > 0 ? (
                                    <ul className="grid gap-2 sm:grid-cols-2">
                                        {highlights.map((highlight, index) => (
                                            <li key={`highlight-${highlight.id}-${index}`} className="flex items-start gap-3 rounded-xl bg-primary/5 px-3 py-3">
                                                <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary" aria-hidden="true">
                                                    {highlight.icon || 'auto_awesome'}
                                                </span>
                                                <span className="text-sm font-medium leading-6 text-on-surface">{highlight.content}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyBlock label="Chưa có điểm nổi bật." />
                                )}
                            </DetailSection>

                            <DetailSection icon="inventory_2" title="Gói dịch vụ" subtitle="So sánh cách đặt tên gói, mô tả, giá cộng thêm và quyền lợi đi kèm.">
                                {packages.length > 0 ? (
                                    <div className="space-y-3">
                                        {packages.map((pkg, index) => <PackagePreview key={`package-${pkg.id}-${index}`} pkg={pkg} />)}
                                    </div>
                                ) : (
                                    <EmptyBlock label="Chưa có gói dịch vụ riêng." />
                                )}
                            </DetailSection>

                            <DetailSection icon="event_available" title="Lịch khởi hành" subtitle="Các ngày bán thực tế giúp staff hiểu cách cấu hình giá và số ghế.">
                                {departures.length > 0 ? (
                                    <ul className="space-y-2">
                                        {departures.slice(0, 5).map((departure, index) => <DeparturePreview key={`departure-${departure.id}-${index}`} departure={departure} />)}
                                    </ul>
                                ) : (
                                    <EmptyBlock label="Chưa có lịch khởi hành chi tiết." />
                                )}
                            </DetailSection>

                            <DetailSection icon="route" title="Lịch trình mẫu" subtitle="Phần này là khung quan trọng nhất khi staff viết bản nháp để admin duyệt.">
                                {itinerary.length > 0 ? (
                                    <div>
                                        {itinerary.map((day, index) => (
                                            <ItineraryDayPreview key={`itinerary-${day.id}-${index}`} day={day} isFirst={index === 0} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyBlock label="Chưa có lịch trình từng ngày." />
                                )}
                            </DetailSection>

                            <DetailSection icon="help" title="FAQ" subtitle="Các câu hỏi hay gặp trước khi đặt tour.">
                                {faqs.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {faqs.map((faq, index) => (
                                            <div key={`faq-${faq.id}-${index}`} className="rounded-xl bg-surface-container-low/60 px-4 py-3">
                                                <p className="text-xs font-bold uppercase tracking-wider text-primary">Q{index + 1}</p>
                                                <p className="mt-1 text-sm font-bold text-on-surface">{faq.question}</p>
                                                <p className="mt-1.5 text-xs leading-6 text-on-surface-variant">{faq.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyBlock label="Chưa có FAQ." />
                                )}
                            </DetailSection>
                        </div>

                        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
                            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Mục tiêu tham khảo</p>
                                <h3 className="mt-2 text-base font-extrabold text-on-surface">
                                    Một tour tốt cần rõ nội dung, lịch trình và khả năng bán.
                                </h3>
                                <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                                    Staff có thể dùng màn này để đối chiếu trước khi tạo bản nháp, tránh gửi thiếu thông tin khiến admin phải từ chối.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Checklist chuẩn duyệt</p>
                                        <p className="mt-1 text-sm font-extrabold text-on-surface">{completedCount}/{completionItems.length} mục đã có</p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-sm font-extrabold text-emerald-700">
                                        {Math.round((completedCount / completionItems.length) * 100)}%
                                    </div>
                                </div>
                                <ul className="space-y-2">
                                    {completionItems.map((item, index) => <CompletionRow key={`checklist-${index}-${item.label}`} item={item} />)}
                                </ul>
                            </div>

                            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Ảnh tour</p>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {previewImageUrls.slice(0, 6).map((url, index) => (
                                        <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-surface-container">
                                            <Image src={url} alt={`${tour.name} ${index + 1}`} fill sizes="120px" className="object-cover" />
                                        </div>
                                    ))}
                                    {previewImageUrls.length === 0 && (
                                        <div className="col-span-3 rounded-xl border border-dashed border-outline-variant/30 px-3 py-6 text-center text-xs font-medium text-on-surface-variant">
                                            Chưa có ảnh thư viện.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm">
                                <div className="space-y-2">
                                    {tour.status === 'PUBLISHED' && (
                                        <a
                                            href={`/tour/${tour.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                                        >
                                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">open_in_new</span>
                                            Xem trang khách
                                        </a>
                                    )}
                                    {isStaff && (
                                        <button
                                            type="button"
                                            onClick={onCreateDraft}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary outline-none"
                                        >
                                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">edit_note</span>
                                            Tạo bản nháp mới
                                        </button>
                                    )}
                                </div>
                                <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
                                    Màn này chỉ để xem và học cấu trúc. Các thao tác sửa, ẩn hoặc duyệt vẫn đi theo quyền hiện tại.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </aside>
        </div>
    );
}
