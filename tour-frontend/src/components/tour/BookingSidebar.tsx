import React, { useMemo, useState } from 'react';
import { Tour, TourPackage, TourDeparture } from '@/types';
import DepartureCalendarModal from './DepartureCalendarModal';
import TransportSummaryCard from './TransportSummaryCard';

const LOW_SEAT_THRESHOLD = 10;

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

interface BookingSidebarProps {
    tour: Tour;
    selectedDeparture: TourDeparture | null;
    onSelectDeparture: (departure: TourDeparture) => void;
    selectedPackage: TourPackage | null;
    formatPrice: (n: number) => string;
    formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
    t: TranslationFn;
    language: string;
}

export default function BookingSidebarNew({
    tour,
    selectedDeparture,
    onSelectDeparture,
    selectedPackage,
    formatPrice,
    formatDate,
    t,
    language,
}: BookingSidebarProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const departures: TourDeparture[] = useMemo(() => tour?.departures ?? [], [tour?.departures]);
    const hasDepartures = departures.length > 0;
    const hasPackages = (tour?.packages?.length ?? 0) > 0;

    // Giá hiện tại: package.price là giá toàn phần (mô hình Hướng A / Klook).
    // Không cộng thêm departure.price nữa.
    const effectivePrice = selectedPackage?.price ?? 0;

    // Giá thấp nhất (dùng cho "Từ X đ") = giá của package đầu tiên (sortOrder thấp nhất)
    const minPackagePrice = tour?.packages?.length
        ? Math.min(...(tour.packages.map((p: TourPackage) => p.price)))
        : tour?.price ?? 0;

    // Link to checkout
    const buildCheckoutUrl = () => {
        const params = new URLSearchParams({ tourId: String(tour?.id ?? '') });
        if (selectedDeparture) params.set('departureId', String(selectedDeparture.id));
        if (selectedPackage) params.set('packageId', String(selectedPackage.id));
        return `/checkout?${params.toString()}`;
    };

    return (
        <div className="col-span-1 lg:col-span-4">
            <div className="sticky top-28 bg-white rounded-3xl shadow-xl border border-outline-variant/10 overflow-hidden">
                {/* ── Price header ── */}
                <div className="bg-gradient-to-br from-primary to-primary-container p-6 text-white">
                    <p className="text-xs font-semibold opacity-70 mb-1 uppercase tracking-wider">
                        {selectedDeparture ? t('tour_detail.totalPerPerson') : (hasDepartures ? t('tour_detail.fromPerPerson') : t('tour_detail.listedPrice'))}
                    </p>
                    <p className="text-3xl font-extrabold leading-none">
                        {selectedPackage
                            ? formatPrice(effectivePrice)
                            : formatPrice(minPackagePrice)
                        }
                    </p>
                    {hasDepartures && !selectedDeparture && (
                        <p className="text-xs opacity-60 mt-1">{t('tour_detail.chooseDateForPrice')}</p>
                    )}
                </div>

                <div className="p-5 space-y-5">
                    {/* ── Tour Info ── */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">{t('tour_detail.departurePoint')}</p>
                                <p className="font-semibold text-on-surface text-sm">
                                    {tour?.departurePoint || t('tour_detail.contactForInfo')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">{t('tour_detail.tourCode')}</p>
                                <p className="font-mono font-semibold text-on-surface text-sm tracking-wider">
                                    {tour?.tourCode?.substring(0, 12) ?? '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Select Departure Date ── */}
                    <div className="border-t border-outline-variant/15 pt-5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-primary">calendar_month</span>
                            {t('tour_detail.selectDeparture')}
                        </p>

                        {hasDepartures ? (
                            <button
                                onClick={() => setIsCalendarOpen(true)}
                                className="w-full text-left px-4 py-3.5 rounded-2xl border-2 border-outline-variant/20 hover:border-primary/40 bg-surface-container-lowest hover:shadow-sm transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${selectedDeparture ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/5 group-hover:text-primary'}`}>
                                        <span className="material-symbols-outlined">{selectedDeparture ? 'event_available' : 'calendar_today'}</span>
                                    </div>
                                    <div>
                                        {selectedDeparture ? (
                                            <>
                                                <p className="font-bold text-sm text-on-surface">
                                                    {formatDate(selectedDeparture.departureDate, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </p>
                                                <p className="text-[11px] text-primary font-medium mt-0.5">
                                                    {selectedDeparture.availableSeats <= LOW_SEAT_THRESHOLD
                                                        ? t('tour_detail.onlySpotsLeft', { seats: selectedDeparture.availableSeats })
                                                        : t('tour_detail.availableSeats')}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-bold text-sm text-on-surface">{t('tour_detail.chooseDepartureDate')}</p>
                                                <p className="text-[11px] text-on-surface-variant mt-0.5">{t('tour_detail.viewPriceAvailability')}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">edit</span>
                            </button>
                        ) : (
                            <div className="bg-surface-container-low/50 rounded-2xl p-4 text-center">
                                <span className="material-symbols-outlined text-outline/50 text-3xl block mb-2">event_busy</span>
                                <p className="text-xs text-outline">{t('tour_detail.noSchedule')}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Transport info for selected departure ── */}
                    {selectedDeparture?.transport && selectedDeparture.transport.type !== 'SELF_ARRANGED' && (
                        <TransportSummaryCard transport={selectedDeparture.transport} language={language} />
                    )}

                    {/* ── Package selected confirmation ── */}
                    {selectedPackage && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-amber-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>hotel_class</span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{t('tour_detail.packageSelected')}</p>
                                <p className="text-sm font-semibold text-amber-900 truncate">{selectedPackage.name}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Book CTA ── */}
                    {!hasPackages ? (
                        <button
                            disabled
                            className="w-full py-4 bg-surface-container text-outline rounded-2xl font-bold text-sm cursor-not-allowed"
                        >
                            {t('tour_detail.notBookableYet')}
                        </button>
                    ) : (!hasDepartures || selectedDeparture) ? (
                        selectedPackage ? (
                            <a
                                href={buildCheckoutUrl()}
                                className="group inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-container px-5 py-4 text-center text-sm font-bold text-white shadow-lg shadow-primary/20 transition-[transform,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                                <span className="material-symbols-outlined text-[18px] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 motion-reduce:transform-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    shopping_bag
                                </span>
                                {t('tour_detail.bookNowCta', { price: formatPrice(effectivePrice) })}
                            </a>
                        ) : (
                            <button
                                disabled
                                className="w-full py-4 bg-surface-container text-outline rounded-2xl font-bold text-sm cursor-not-allowed"
                            >
                                {t('tour_detail.selectPackageFirst')}
                            </button>
                        )
                    ) : (
                        <button
                            disabled
                            className="w-full py-4 bg-surface-container text-outline rounded-2xl font-bold text-sm cursor-not-allowed"
                        >
                            {t('tour_detail.selectDateFirst')}
                        </button>
                    )}

                    {/* Trust indicators */}
                    <div className="space-y-2 pt-1">
                        {[
                            { icon: 'verified_user', text: t('tour_detail.paymentSecure') },
                            { icon: 'cancel', text: t('tour_detail.freeCancellation24h') },
                            { icon: 'support_agent', text: t('tour_detail.support247') },
                        ].map(item => (
                            <div key={item.text} className="flex items-center gap-2 text-xs text-on-surface-variant">
                                <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                {item.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Mobile sticky bottom CTA (Vietravel-style): luôn truy cập được, không cần cuộn ── */}
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/15 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                            {selectedDeparture ? t('tour_detail.totalPerPerson') : t('tour_detail.fromPerPerson')}
                        </p>
                        <p className="text-xl font-extrabold leading-none text-primary">
                            {formatPrice(selectedPackage ? effectivePrice : minPackagePrice)}
                        </p>
                    </div>
                    <div className="flex-1">
                        {!hasPackages ? (
                            <button disabled className="w-full py-3.5 bg-surface-container text-outline rounded-xl font-bold text-sm cursor-not-allowed">
                                {t('tour_detail.notBookableYet')}
                            </button>
                        ) : hasDepartures && !selectedDeparture ? (
                            <button
                                onClick={() => setIsCalendarOpen(true)}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-bold text-sm shadow-lg shadow-primary/20 transition-transform active:scale-[0.97] inline-flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                {t('tour_detail.chooseDepartureDate')}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Đã chọn lịch — vẫn cho đổi sang lịch khác bằng nút icon bên cạnh */}
                                {hasDepartures && selectedDeparture && (
                                    <button
                                        onClick={() => setIsCalendarOpen(true)}
                                        aria-label={t('tour_detail.selectDeparture')}
                                        className="shrink-0 h-[46px] w-[46px] rounded-xl border-2 border-primary/30 bg-white text-primary flex items-center justify-center transition-transform active:scale-[0.95]"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
                                    </button>
                                )}
                                {selectedPackage ? (
                                    <a
                                        href={buildCheckoutUrl()}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-bold text-sm shadow-lg shadow-primary/20 transition-transform active:scale-[0.97] inline-flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                                        {t('tour_detail.bookNow')}
                                    </a>
                                ) : (
                                    <button disabled className="flex-1 py-3.5 bg-surface-container text-outline rounded-xl font-bold text-sm cursor-not-allowed">
                                        {t('tour_detail.selectPackageFirst')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DepartureCalendarModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                departures={departures}
                selectedDeparture={selectedDeparture}
                onSelectDeparture={onSelectDeparture}
                t={t}
                language={language}
            />
        </div>
    );
}
