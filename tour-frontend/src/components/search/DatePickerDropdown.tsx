'use client';

import { useEffect, useRef, useState } from 'react';

interface DatePickerDropdownProps {
    value: string;
    onChange: (val: string) => void;
    minDate?: string;
    language?: string;
    label?: string;
    placeholder?: string;
    triggerId?: string;
    variant?: 'hero' | 'field';
    dropdownClassName?: string;
}

const VI_MONTHS_SHORT = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const VI_MONTHS_LONG = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const VI_DAYS = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];
const EN_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type View = 'calendar' | 'month' | 'year';

function toYMD(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYMD(ymd: string): Date | null {
    if (!ymd) return null;
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(ymd: string, language: string) {
    const date = parseYMD(ymd);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return language === 'vi' ? `${day}/${month}/${date.getFullYear()}` : `${month}/${day}/${date.getFullYear()}`;
}

export default function DatePickerDropdown({
    value,
    onChange,
    minDate,
    language = 'vi',
    label,
    placeholder,
    triggerId,
    variant = 'hero',
    dropdownClassName = '',
}: DatePickerDropdownProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = parseYMD(value);
    const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<View>('calendar');
    const [yearStart, setYearStart] = useState(Math.floor((selected?.getFullYear() ?? today.getFullYear()) / 12) * 12);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setView('calendar');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const monthsShort = language === 'vi' ? VI_MONTHS_SHORT : EN_MONTHS_SHORT;
    const monthsLong = language === 'vi' ? VI_MONTHS_LONG : EN_MONTHS_LONG;
    const days = language === 'vi' ? VI_DAYS : EN_DAYS;

    const stop = (event: React.MouseEvent) => event.stopPropagation();
    const closePicker = () => {
        setIsOpen(false);
        setView('calendar');
    };
    const toggleOpen = (event: React.MouseEvent) => {
        stop(event);
        if (isOpen) setView('calendar');
        setIsOpen(open => !open);
    };

    const prevMonth = (event: React.MouseEvent) => {
        stop(event);
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(year => year - 1);
        } else {
            setViewMonth(month => month - 1);
        }
    };

    const nextMonth = (event: React.MouseEvent) => {
        stop(event);
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(year => year + 1);
        } else {
            setViewMonth(month => month + 1);
        }
    };

    const buildGrid = () => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const startIndex = (firstDay.getDay() + 6) % 7;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
        const cells: { date: Date; inMonth: boolean }[] = [];

        for (let i = startIndex - 1; i >= 0; i--) {
            cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i), inMonth: false });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            cells.push({ date: new Date(viewYear, viewMonth, day), inMonth: true });
        }
        for (let day = 1; day <= 42 - cells.length; day++) {
            cells.push({ date: new Date(viewYear, viewMonth + 1, day), inMonth: false });
        }
        return cells;
    };

    const cells = buildGrid();
    const minDateObj = parseYMD(minDate ?? '');
    const limitDate = minDateObj || today;
    const limitYear = limitDate.getFullYear();
    const limitMonth = limitDate.getMonth();
    const years = Array.from({ length: 12 }, (_, index) => yearStart + index);
    const displayText = formatDisplay(value, language);
    const pickerLabel = label || (language === 'vi' ? 'Chọn ngày' : 'Select date');
    const dropdownPositionClass = variant === 'field'
        ? 'top-[calc(100%+8px)] left-0 z-[300]'
        : 'top-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-[200]';

    const isDisabled = (date: Date) => minDateObj ? date < minDateObj : date < today;
    const isSelectedDay = (date: Date) => value === toYMD(date);
    const isTodayCell = (date: Date) => toYMD(date) === toYMD(today);

    const navBtn = (icon: string, onClick: (event: React.MouseEvent) => void, dark = false, disabled = false) => (
        <button
            type="button"
            onClick={onClick}
            aria-label={icon}
            disabled={disabled}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                disabled
                    ? 'cursor-not-allowed text-slate-200 opacity-50'
                    : dark
                        ? 'bg-slate-800 text-white hover:bg-slate-700'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
        >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
        </button>
    );

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                id={triggerId}
                type="button"
                aria-label={pickerLabel}
                onClick={toggleOpen}
                className={variant === 'field'
                    ? 'flex h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary'
                    : 'flex w-full flex-col items-center rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                }
            >
                {variant === 'field' ? (
                    <>
                        <span className={`min-w-0 truncate font-semibold ${displayText ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                            {displayText || placeholder || (language === 'vi' ? 'Chọn ngày' : 'Select date')}
                        </span>
                        <span className="material-symbols-outlined shrink-0 text-[18px] text-primary" aria-hidden="true">calendar_month</span>
                    </>
                ) : (
                    <>
                        {label && <span className="mb-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>}
                        <span className={`text-sm font-bold ${displayText ? 'text-slate-800' : 'text-slate-300'}`}>
                            {displayText || placeholder || (language === 'vi' ? 'Chọn ngày' : 'Select date')}
                        </span>
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    className={`absolute ${dropdownPositionClass} animate-fade-in-up ${dropdownClassName}`}
                    style={{ minWidth: 310 }}
                    onClick={stop}
                >
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/5">
                        {view === 'calendar' && (
                            <>
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                    {navBtn('chevron_left', prevMonth, false, viewYear < limitYear || (viewYear === limitYear && viewMonth <= limitMonth))}
                                    <button
                                        type="button"
                                        onClick={(event) => { stop(event); setView('month'); }}
                                        className="group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-100"
                                    >
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-primary">{monthsLong[viewMonth]}</span>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-primary">{viewYear}</span>
                                        <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-primary" aria-hidden="true">expand_more</span>
                                    </button>
                                    {navBtn('chevron_right', nextMonth, true)}
                                </div>

                                <div className="grid grid-cols-7 px-3 pb-1 pt-3">
                                    {days.map((day, index) => (
                                        <div key={day} className={`pb-2 text-center text-[11px] font-bold ${index === 6 ? 'text-red-400' : 'text-slate-400'}`}>{day}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-4">
                                    {cells.map((cell, index) => {
                                        const disabled = isDisabled(cell.date);
                                        const selectedDay = isSelectedDay(cell.date);
                                        const todayCell = isTodayCell(cell.date);
                                        const sunday = index % 7 === 6;
                                        return (
                                            <button
                                                key={`${toYMD(cell.date)}-${index}`}
                                                type="button"
                                                disabled={disabled}
                                                onClick={(event) => {
                                                    stop(event);
                                                    if (!disabled) {
                                                        onChange(toYMD(cell.date));
                                                        closePicker();
                                                    }
                                                }}
                                                className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-150 ${
                                                    selectedDay
                                                        ? 'scale-105 bg-primary text-white shadow-sm shadow-primary/30'
                                                        : disabled
                                                            ? 'cursor-not-allowed text-slate-200'
                                                            : !cell.inMonth
                                                                ? 'text-slate-300 hover:bg-slate-50'
                                                                : sunday
                                                                    ? 'text-red-400 hover:bg-red-50'
                                                                    : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {cell.date.getDate()}
                                                {todayCell && !selectedDay && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={(event) => { stop(event); onChange(''); closePicker(); }}
                                        className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        {language === 'vi' ? 'Xóa' : 'Clear'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            stop(event);
                                            if (!isDisabled(today)) {
                                                onChange(toYMD(today));
                                                closePicker();
                                            }
                                        }}
                                        className="rounded-lg px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5 hover:text-primary-container"
                                    >
                                        {language === 'vi' ? 'Hôm nay' : 'Today'}
                                    </button>
                                </div>
                            </>
                        )}

                        {view === 'month' && (
                            <>
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                    {navBtn('chevron_left', (event) => { stop(event); setViewYear(year => year - 1); }, false, viewYear <= limitYear)}
                                    <button
                                        type="button"
                                        onClick={(event) => { stop(event); setYearStart(Math.floor(viewYear / 12) * 12); setView('year'); }}
                                        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-100"
                                    >
                                        <span className="text-sm font-bold text-slate-800 group-hover:text-primary">{viewYear}</span>
                                        <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-primary" aria-hidden="true">expand_more</span>
                                    </button>
                                    {navBtn('chevron_right', (event) => { stop(event); setViewYear(year => year + 1); })}
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-4">
                                    {monthsShort.map((month, index) => {
                                        const disabled = viewYear < limitYear || (viewYear === limitYear && index < limitMonth);
                                        return (
                                            <button
                                                key={month}
                                                type="button"
                                                disabled={disabled}
                                                onClick={(event) => { stop(event); setViewMonth(index); setView('calendar'); }}
                                                className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                                                    disabled
                                                        ? 'cursor-not-allowed text-slate-200'
                                                        : index === viewMonth
                                                            ? 'bg-primary text-white shadow-sm'
                                                            : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {month}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-center border-t border-slate-100 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={(event) => { stop(event); setView('calendar'); }}
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        {language === 'vi' ? '← Quay lại' : '← Back'}
                                    </button>
                                </div>
                            </>
                        )}

                        {view === 'year' && (
                            <>
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                    {navBtn('chevron_left', (event) => { stop(event); setYearStart(start => start - 12); }, false, yearStart <= limitYear)}
                                    <span className="text-sm font-bold text-slate-600">{yearStart} - {yearStart + 11}</span>
                                    {navBtn('chevron_right', (event) => { stop(event); setYearStart(start => start + 12); })}
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-4">
                                    {years.map(year => {
                                        const disabled = year < limitYear;
                                        return (
                                            <button
                                                key={year}
                                                type="button"
                                                disabled={disabled}
                                                onClick={(event) => { stop(event); setViewYear(year); setView('month'); }}
                                                className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                                                    disabled
                                                        ? 'cursor-not-allowed text-slate-200'
                                                        : year === viewYear
                                                            ? 'bg-primary text-white shadow-sm'
                                                            : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {year}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-center border-t border-slate-100 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={(event) => { stop(event); setView('month'); }}
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        {language === 'vi' ? '← Quay lại' : '← Back'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
