import React, { useState, useMemo } from 'react';
import { TourDeparture } from '@/types';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

interface DepartureCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    departures: TourDeparture[];
    selectedDeparture: TourDeparture | null;
    onSelectDeparture: (dep: TourDeparture) => void;
    t: TranslationFn;
    language: string;
}

const LOW_SEAT_THRESHOLD = 10;

function getInitialCalendarDate(selectedDeparture: TourDeparture | null, departures: TourDeparture[]) {
    if (selectedDeparture) {
        return new Date(selectedDeparture.departureDate);
    }

    if (departures.length === 0) return new Date();

    const sorted = [...departures].sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const firstFuture = sorted.find((departure) => new Date(departure.departureDate) >= today);
    return new Date((firstFuture || sorted[0]).departureDate);
}

export default function DepartureCalendarModal({
    isOpen,
    onClose,
    departures,
    selectedDeparture,
    onSelectDeparture,
    t,
    language,
}: DepartureCalendarModalProps) {
    const initialDate = useMemo(
        () => getInitialCalendarDate(selectedDeparture, departures),
        [selectedDeparture, departures]
    );
    const calendarResetKey = `${selectedDeparture?.id ?? 'none'}:${departures.map((departure) => `${departure.id}-${departure.departureDate}`).join('|')}`;
    const [calendarState, setCalendarState] = useState({ date: initialDate, resetKey: calendarResetKey });

    if (isOpen && calendarState.resetKey !== calendarResetKey) {
        setCalendarState({ date: initialDate, resetKey: calendarResetKey });
    }

    const currentDate = calendarState.date;
    const setCurrentDate = (date: Date) => setCalendarState({ date, resetKey: calendarResetKey });

    // Create a dictionary of departures for O(1) lookup
    const departuresMap = useMemo(() => {
        const map: Record<string, TourDeparture> = {};
        departures.forEach(dep => {
            const dateStr = new Date(dep.departureDate).toISOString().split('T')[0];
            map[dateStr] = dep;
        });
        return map;
    }, [departures]);

    if (!isOpen) return null;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // 0 = Sun, 1 = Mon. We want Monday to be 0 for the grid.
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const startDayIndex = (firstDayOfMonth + 6) % 7; 

    const monthNames = language === 'vi'
        ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = language === 'vi'
        ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

    const todayStr = new Date().toISOString().split('T')[0];

    // Build grid cells
    const cells = [];
    // Empty cells before the 1st day
    for (let i = 0; i < startDayIndex; i++) {
        cells.push(<div key={`empty-${i}`} className="h-20 sm:h-24 bg-surface-container-lowest/50 rounded-xl border border-transparent"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(currentYear, currentMonth, day);
        // Format as local YYYY-MM-DD
        const dateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const departure = departuresMap[dateStr];
        const isPast = dateStr < todayStr;
        const isSelected = selectedDeparture?.id === departure?.id;
        const isSoldOut = departure?.availableSeats === 0;
        const isRunningLow = Boolean(departure && departure.availableSeats > 0 && departure.availableSeats <= LOW_SEAT_THRESHOLD);
        // Chỉ lộ số ghế cụ thể khi sắp hết (1–10) để tạo cảm giác gấp; còn nhiều
        // (>10) chỉ hiển thị "Có sẵn chỗ", không khoe số tồn kho. 0 ghế → "Hết chỗ".
        // Bản short dùng cho điện thoại (7 cột rất hẹp) để khỏi bị cắt chữ.
        const seats = departure?.availableSeats ?? 0;
        const statusTextFull = isSoldOut
            ? t('tour_detail.soldOut')
            : isRunningLow
                ? t('tour_detail.seatsLeft', { seats })
                : t('tour_detail.availableSeats');
        const statusTextShort = isSoldOut
            ? t('tour_detail.soldOutShort')
            : isRunningLow
                ? String(seats)
                : t('tour_detail.available');
        const statusToneClass = isSoldOut
            ? 'bg-red-50 text-red-600 border-red-100'
            : isRunningLow
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100';
        const statusDotClass = isSoldOut
            ? 'bg-red-400'
            : isRunningLow
                ? 'bg-amber-400'
                : 'bg-emerald-400';

        cells.push(
            <div key={`day-${day}`} className="relative h-16 sm:h-24">
                {departure && !isPast ? (
                    <button
                        onClick={() => {
                            if (departure.availableSeats > 0) {
                                onSelectDeparture(departure);
                                onClose();
                            }
                        }}
                        disabled={departure.availableSeats === 0}
                        className={`w-full h-full p-1 sm:p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-between ${
                            isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : departure.availableSeats === 0
                                ? 'border-outline-variant/10 bg-surface-container-low/30 opacity-60 cursor-not-allowed'
                                : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-lowest bg-white cursor-pointer'
                        }`}
                    >
                        <div className="flex items-center gap-1">
                            <span className={`text-base sm:text-base font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{day}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></span>
                        </div>
                        <p className={`flex w-full items-center justify-center rounded-md border px-0.5 py-0.5 sm:px-1.5 text-[11px] sm:text-[10px] font-bold leading-tight ${statusToneClass}`}>
                            <span className="sm:hidden">{statusTextShort}</span>
                            <span className="hidden sm:inline truncate">{statusTextFull}</span>
                        </p>
                    </button>
                ) : (
                    <div className="w-full h-full p-1 sm:p-2 rounded-xl border border-outline-variant/10 bg-surface-container-lowest/30 flex items-start justify-center sm:justify-start opacity-40 cursor-not-allowed">
                        <span className="text-base sm:text-sm font-medium text-outline">{day}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold font-headline text-on-surface">{t('tour_detail.selectDeparture')}</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Calendar Controls */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-surface-container-lowest">
                    <button onClick={handlePrevMonth} className="p-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container hover:text-primary transition-all flex items-center">
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <h3 className="text-lg font-bold text-on-surface uppercase tracking-wide">
                        {monthNames[currentMonth]} <span className="text-primary">{currentYear}</span>
                    </h3>
                    <button onClick={handleNextMonth} className="p-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container hover:text-primary transition-all flex items-center">
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 min-h-0 px-2 sm:px-6 pb-4 overflow-y-auto">
                    {/* Days of week */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-2">
                        {dayNames.map((day, i) => (
                            <div key={day} className={`text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider py-2 ${i === 6 ? 'text-red-500' : 'text-outline'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-3">
                        {cells}
                    </div>
                </div>

                {/* Legend — ghim ngoài vùng cuộn để luôn hiển thị, kể cả tháng có 6 hàng */}
                <div className="px-2 sm:px-6 pt-3 pb-6 shrink-0">
                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-on-surface-variant justify-center bg-surface-container-lowest py-3 rounded-2xl border border-outline-variant/10">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {t('tour_detail.available')}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span> {t('tour_detail.runningLow')}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span> {t('tour_detail.soldOut')}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded border-2 border-primary bg-primary/5"></div> {t('tour_detail.selectedDate')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
