import React, { useState, useMemo } from 'react';
import { TourDeparture } from '@/types';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

interface DepartureCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    departures: TourDeparture[];
    selectedDeparture: TourDeparture | null;
    onSelectDeparture: (dep: TourDeparture) => void;
    formatPrice: (n: number) => string;
    tourPrice: number;
    t: TranslationFn;
    language: string;
}

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
    formatPrice,
    tourPrice,
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

        cells.push(
            <div key={`day-${day}`} className="relative h-20 sm:h-24">
                {departure && !isPast ? (
                    <button
                        onClick={() => {
                            if (departure.availableSeats > 0) {
                                onSelectDeparture(departure);
                                onClose();
                            }
                        }}
                        disabled={departure.availableSeats === 0}
                        className={`w-full h-full p-1.5 sm:p-2 rounded-xl border-2 transition-all flex flex-col items-start justify-between ${
                            isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : departure.availableSeats === 0
                                ? 'border-outline-variant/10 bg-surface-container-low/30 opacity-60 cursor-not-allowed'
                                : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-lowest bg-white cursor-pointer'
                        }`}
                    >
                        <div className="w-full flex justify-between items-start">
                            <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{day}</span>
                            {departure.availableSeats === 0 ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 hidden sm:block">{t('tour_detail.soldOutShort')}</span>
                            ) : departure.availableSeats <= 5 ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 hidden sm:block">{t('tour_detail.seatsLeft', { seats: departure.availableSeats })}</span>
                            ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 mr-0.5 hidden sm:block"></span>
                            )}
                        </div>
                        <div className="w-full text-left mt-auto">
                            <p className={`text-[10px] sm:text-[11px] font-extrabold leading-tight truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                {formatPrice(departure.price ?? tourPrice)}
                            </p>
                            {/* Mobile badge */}
                            <p className="text-[9px] mt-0.5 sm:hidden font-medium">
                                {departure.availableSeats === 0 ? <span className="text-red-500">{t('tour_detail.soldOut')}</span> : departure.availableSeats <= 5 ? <span className="text-amber-600">{t('tour_detail.seatsLeft', { seats: departure.availableSeats })}</span> : <span className="text-emerald-600">{t('tour_detail.availableSeats')}</span>}
                            </p>
                        </div>
                    </button>
                ) : (
                    <div className="w-full h-full p-2 rounded-xl border border-outline-variant/10 bg-surface-container-lowest/30 flex flex-col opacity-40 cursor-not-allowed">
                        <span className="text-sm font-medium text-outline">{day}</span>
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
                        <p className="text-xs text-on-surface-variant mt-0.5">{t('tour_detail.departurePriceHint')}</p>
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
                <div className="px-6 pb-6 overflow-y-auto">
                    {/* Days of week */}
                    <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">
                        {dayNames.map((day, i) => (
                            <div key={day} className={`text-center text-xs font-bold uppercase tracking-wider py-2 ${i === 6 ? 'text-red-500' : 'text-outline'}`}>
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    {/* Dates */}
                    <div className="grid grid-cols-7 gap-2 sm:gap-3">
                        {cells}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] font-medium text-on-surface-variant justify-center bg-surface-container-lowest py-3 rounded-2xl border border-outline-variant/10">
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
