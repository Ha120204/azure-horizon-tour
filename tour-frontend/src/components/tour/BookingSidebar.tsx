import React, { useEffect, useMemo, useState } from 'react';
import { Tour, TourPackage, TourDeparture } from '@/types';
import DepartureCalendarModal from './DepartureCalendarModal';
import TransportSummaryCard from './TransportSummaryCard';
import { PASSENGER_MULTIPLIERS } from '@/lib/booking/passengerPricing';
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings } from '@/lib/settings/publicSettings';

const LOW_SEAT_THRESHOLD = 10;

type GuestKey = 'adults' | 'children' | 'infants';

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
    const [isGuestsOpen, setIsGuestsOpen] = useState(false);
    const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
    const [guests, setGuests] = useState({ adults: 1, children: 0, infants: 0 });

    useEffect(() => {
        const controller = new AbortController();
        fetchPublicSettings(controller.signal)
            .then(setPublicSettings)
            .catch(() => {});
        return () => controller.abort();
    }, []);

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

    // Sẵn sàng chọn số khách khi đã có gói và (không có lịch / đã chọn lịch).
    const isReadyForGuests = hasPackages && !!selectedPackage && (!hasDepartures || !!selectedDeparture);

    // Trần số khách: tổng người ≤ booking_max_people; ghế (adult+child, infant không tính ghế)
    // ≤ số ghế còn lại của chuyến; infant ≤ số người lớn.
    const maxPeople = publicSettings.booking_max_people;
    const seatLimit = selectedDeparture?.availableSeats ?? (hasDepartures ? 0 : tour?.availableSeats ?? 0);
    const totalGuests = guests.adults + guests.children + guests.infants;
    const seatsUsed = guests.adults + guests.children;
    const reachedMaxPeople = totalGuests >= maxPeople;
    const reachedSeatLimit = seatsUsed >= seatLimit;

    const guestSubtotal = effectivePrice * (
        guests.adults * PASSENGER_MULTIPLIERS['Adult (12+)'] +
        guests.children * PASSENGER_MULTIPLIERS['Child (4-11)'] +
        guests.infants * PASSENGER_MULTIPLIERS['Infant (<4)']
    );

    const guestSummary = [
        `${guests.adults} ${t('tour_detail.guestsAdults')}`,
        guests.children > 0 ? `${guests.children} ${t('tour_detail.guestsChildren')}` : null,
        guests.infants > 0 ? `${guests.infants} ${t('tour_detail.guestsInfants')}` : null,
    ].filter(Boolean).join(' · ');

    const changeGuest = (key: GuestKey, delta: number) => {
        setGuests(prev => {
            const next = { ...prev, [key]: Math.max(0, prev[key] + delta) };
            if (next.adults < 1) next.adults = 1;
            if (next.infants > next.adults) next.infants = next.adults;
            return next;
        });
    };

    // Link to checkout
    const buildCheckoutUrl = () => {
        const params = new URLSearchParams({ tourId: String(tour?.id ?? '') });
        if (selectedDeparture) params.set('departureId', String(selectedDeparture.id));
        if (selectedPackage) params.set('packageId', String(selectedPackage.id));
        params.set('adults', String(guests.adults));
        params.set('children', String(guests.children));
        params.set('infants', String(guests.infants));
        return `/checkout?${params.toString()}`;
    };

    return (
        <div className="col-span-1 lg:col-span-4">
            <div className="sticky top-28 bg-white rounded-3xl shadow-xl border border-outline-variant/10 overflow-hidden lg:flex lg:flex-col lg:max-h-[calc(100vh-7.5rem)]">
                {/* ── Price header ── */}
                <div className="bg-gradient-to-br from-primary to-primary-container p-6 text-white lg:shrink-0">
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

                <div className="p-5 space-y-5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
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

                    {/* ── Chọn số khách (thu gọn, bấm để mở) ── */}
                    {isReadyForGuests && (
                        <div className="border-t border-outline-variant/15 pt-5">
                            <button
                                type="button"
                                onClick={() => setIsGuestsOpen(open => !open)}
                                aria-expanded={isGuestsOpen}
                                className="w-full flex items-center justify-between gap-3 text-left rounded-2xl px-1 py-1 transition-colors hover:bg-surface-container-low/60"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">{t('tour_detail.guestsLabel')}</p>
                                        <p className="font-semibold text-on-surface text-sm truncate">{guestSummary}</p>
                                    </div>
                                </div>
                                <span className={`material-symbols-outlined text-outline transition-transform duration-200 ${isGuestsOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {isGuestsOpen && (
                            <div className="mt-3 space-y-1">
                                {([
                                    { key: 'adults' as GuestKey, label: t('tour_detail.guestsAdults'), age: t('tour_detail.guestsAdultsAge'), value: guests.adults, canDec: guests.adults > 1, canInc: !reachedSeatLimit && !reachedMaxPeople },
                                    { key: 'children' as GuestKey, label: t('tour_detail.guestsChildren'), age: t('tour_detail.guestsChildrenAge'), value: guests.children, canDec: guests.children > 0, canInc: !reachedSeatLimit && !reachedMaxPeople },
                                    { key: 'infants' as GuestKey, label: t('tour_detail.guestsInfants'), age: t('tour_detail.guestsInfantsAge'), value: guests.infants, canDec: guests.infants > 0, canInc: guests.infants < guests.adults && !reachedMaxPeople },
                                ]).map(row => (
                                    <div key={row.key} className="flex items-center justify-between py-1.5">
                                        <div>
                                            <p className="font-semibold text-sm text-on-surface">{row.label}</p>
                                            <p className="text-[11px] text-outline">{row.age}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => changeGuest(row.key, -1)}
                                                disabled={!row.canDec}
                                                aria-label={`-1 ${row.label}`}
                                                className="h-9 w-9 rounded-full border-2 border-outline-variant/30 text-primary flex items-center justify-center transition-colors hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-outline-variant/30"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">remove</span>
                                            </button>
                                            <span className="w-6 text-center font-bold text-on-surface tabular-nums">{row.value}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeGuest(row.key, 1)}
                                                disabled={!row.canInc}
                                                aria-label={`+1 ${row.label}`}
                                                className="h-9 w-9 rounded-full border-2 border-outline-variant/30 text-primary flex items-center justify-center transition-colors hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-outline-variant/30"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {guests.infants > 0 && (
                                    <p className="text-[11px] text-outline mt-2">{t('tour_detail.guestsInfantSeatNote')}</p>
                                )}
                                {reachedMaxPeople && (
                                    <p className="text-[11px] text-amber-600 mt-2">{t('tour_detail.guestsMaxReached', { max: maxPeople })}</p>
                                )}
                            </div>
                            )}
                        </div>
                    )}

                    {/* ── Cam kết (gọn, đặt cuối vùng cuộn) ── */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-outline-variant/15 pt-4 text-[11px] text-on-surface-variant">
                        {[
                            { icon: 'verified_user', text: t('tour_detail.paymentSecure') },
                            { icon: 'cancel', text: t('tour_detail.freeCancellation24h') },
                            { icon: 'support_agent', text: t('tour_detail.support247') },
                        ].map(item => (
                            <span key={item.text} className="inline-flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                {item.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── Footer ghim đáy thẻ: tạm tính + nút Đặt luôn hiển thị ── */}
                <div className="border-t border-outline-variant/10 bg-white p-5 space-y-3 lg:shrink-0">
                    {isReadyForGuests && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t('tour_detail.guestsEstTotal')}</span>
                            <span className="text-lg font-extrabold text-primary">{formatPrice(guestSubtotal)}</span>
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
