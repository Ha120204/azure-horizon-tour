'use client';

import { useState, useRef, useEffect } from 'react';

interface DatePickerDropdownProps {
    value: string;
    onChange: (val: string) => void;
    minDate?: string;
    language?: string;
    label?: string;
    placeholder?: string;
    triggerId?: string;
}

const VI_MONTHS_SHORT = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
const VI_MONTHS_LONG  = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const EN_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EN_MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const VI_DAYS = ['Th 2','Th 3','Th 4','Th 5','Th 6','Th 7','CN'];
const EN_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

type View = 'calendar' | 'month' | 'year';

function toYMD(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseYMD(ymd: string): Date | null {
    if (!ymd) return null;
    const [y,m,d] = ymd.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    return isNaN(dt.getTime()) ? null : dt;
}
function formatDisplay(ymd: string, language: string) {
    const d = parseYMD(ymd);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2,'0');
    const mon = String(d.getMonth()+1).padStart(2,'0');
    return language === 'vi' ? `${day}/${mon}/${d.getFullYear()}` : `${mon}/${day}/${d.getFullYear()}`;
}

export default function DatePickerDropdown({ value, onChange, minDate, language='vi', label, placeholder, triggerId }: DatePickerDropdownProps) {
    const today = new Date(); today.setHours(0,0,0,0);
    const selected = parseYMD(value);

    const [viewYear,  setViewYear]  = useState(selected?.getFullYear()  ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(selected?.getMonth()      ?? today.getMonth());
    const [isOpen,    setIsOpen]    = useState(false);
    const [view,      setView]      = useState<View>('calendar');
    const [yearStart, setYearStart] = useState(Math.floor((selected?.getFullYear() ?? today.getFullYear()) / 12) * 12);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false); setView('calendar');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { if (!isOpen) setView('calendar'); }, [isOpen]);

    const MONTHS_SHORT = language === 'vi' ? VI_MONTHS_SHORT : EN_MONTHS_SHORT;
    const MONTHS_LONG  = language === 'vi' ? VI_MONTHS_LONG  : EN_MONTHS_LONG;
    const DAYS         = language === 'vi' ? VI_DAYS          : EN_DAYS;

    const sp = (e: React.MouseEvent) => e.stopPropagation();

    const prevMonth = (e: React.MouseEvent) => { sp(e); if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
    const nextMonth = (e: React.MouseEvent) => { sp(e); if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

    const buildGrid = () => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const startIdx = (firstDay.getDay()+6)%7;
        const dim  = new Date(viewYear, viewMonth+1, 0).getDate();
        const dipm = new Date(viewYear, viewMonth, 0).getDate();
        const cells: { date: Date; inMonth: boolean }[] = [];
        for (let i=startIdx-1;i>=0;i--)  cells.push({date:new Date(viewYear,viewMonth-1,dipm-i),inMonth:false});
        for (let d=1;d<=dim;d++)          cells.push({date:new Date(viewYear,viewMonth,d),inMonth:true});
        for (let d=1;d<=42-cells.length;d++) cells.push({date:new Date(viewYear,viewMonth+1,d),inMonth:false});
        return cells;
    };

    const cells = buildGrid();
    const minDateObj = parseYMD(minDate ?? '');
    const limitDate = minDateObj || today;
    const limitYear = limitDate.getFullYear();
    const limitMonth = limitDate.getMonth();

    const isDisabled  = (d: Date) => minDateObj ? d < minDateObj : d < today;
    const isSelectedDay = (d: Date) => value === toYMD(d);
    const isTodayCell   = (d: Date) => toYMD(d) === toYMD(today);
    const years = Array.from({length:12},(_,i)=>yearStart+i);
    const displayText = formatDisplay(value, language);

    const navBtn = (label2: string, onClick: (e: React.MouseEvent)=>void, dark=false, disabled=false) => (
        <button type="button" onClick={onClick} aria-label={label2} disabled={disabled}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                disabled ? 'text-slate-200 cursor-not-allowed opacity-50' :
                dark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}>
            <span className="material-symbols-outlined text-[20px]">{label2}</span>
        </button>
    );

    return (
        <div ref={containerRef} className="relative w-full">
            <button id={triggerId} type="button"
                onClick={(e) => { sp(e); setIsOpen(o=>!o); }}
                className="flex flex-col items-center text-center w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg">
                {label && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">{label}</span>}
                <span className={`text-sm font-bold ${displayText ? 'text-slate-800' : 'text-slate-300'}`}>
                    {displayText || placeholder || (language==='vi' ? 'Chọn ngày' : 'Select date')}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up" style={{minWidth:310}} onClick={sp}>
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/5">

                        {/* ── CALENDAR ── */}
                        {view==='calendar' && <>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                {navBtn('chevron_left', prevMonth, false, viewYear < limitYear || (viewYear === limitYear && viewMonth <= limitMonth))}
                                <button type="button" onClick={(e)=>{sp(e);setView('month');}}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group">
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-primary">{MONTHS_LONG[viewMonth]}</span>
                                    <div className="w-px h-4 bg-slate-200"/>
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-primary">{viewYear}</span>
                                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-primary">expand_more</span>
                                </button>
                                {navBtn('chevron_right', nextMonth, true)}
                            </div>

                            <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                                {DAYS.map((d,i)=>(
                                    <div key={d} className={`text-center text-[11px] font-bold pb-2 ${i===6?'text-red-400':'text-slate-400'}`}>{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 px-3 pb-4 gap-y-0.5">
                                {cells.map((cell,idx)=>{
                                    const dis=isDisabled(cell.date), sel=isSelectedDay(cell.date), tod=isTodayCell(cell.date), sun=idx%7===6;
                                    return (
                                        <button key={idx} type="button" disabled={dis}
                                            onClick={(e)=>{sp(e);if(!dis){onChange(toYMD(cell.date));setIsOpen(false);}}}
                                            className={`relative flex items-center justify-center w-9 h-9 mx-auto rounded-full text-[13px] font-semibold transition-all duration-150 ${
                                                sel   ? 'bg-primary text-white shadow-sm shadow-primary/30 scale-105'
                                                : dis ? 'text-slate-200 cursor-not-allowed'
                                                : !cell.inMonth ? 'text-slate-300 hover:bg-slate-50'
                                                : sun ? 'text-red-400 hover:bg-red-50'
                                                : 'text-slate-700 hover:bg-slate-100'}`}>
                                            {cell.date.getDate()}
                                            {tod && !sel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"/>}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                                <button type="button" onClick={(e)=>{sp(e);onChange('');setIsOpen(false);}}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                                    {language==='vi'?'Xóa':'Clear'}
                                </button>
                                <button type="button" onClick={(e)=>{sp(e);if(!isDisabled(today)){onChange(toYMD(today));setIsOpen(false);}}}
                                    className="text-xs font-bold text-primary hover:text-primary-container transition-colors px-2 py-1 rounded-lg hover:bg-primary/5">
                                    {language==='vi'?'Hôm nay':'Today'}
                                </button>
                            </div>
                        </>}

                        {/* ── MONTH PICKER ── */}
                        {view==='month' && <>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                {navBtn('chevron_left', (e)=>{sp(e);setViewYear(y=>y-1);}, false, viewYear <= limitYear)}
                                <button type="button" onClick={(e)=>{sp(e);setYearStart(Math.floor(viewYear/12)*12);setView('year');}}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group">
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-primary">{viewYear}</span>
                                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-primary">expand_more</span>
                                </button>
                                {navBtn('chevron_right', (e)=>{sp(e);setViewYear(y=>y+1);})}
                            </div>
                            <div className="grid grid-cols-3 gap-2 p-4">
                                {MONTHS_SHORT.map((m,idx)=>{
                                    const isMonthDisabled = viewYear < limitYear || (viewYear === limitYear && idx < limitMonth);
                                    return (
                                        <button key={idx} type="button" disabled={isMonthDisabled}
                                            onClick={(e)=>{sp(e);setViewMonth(idx);setView('calendar');}}
                                            className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                isMonthDisabled ? 'text-slate-200 cursor-not-allowed' :
                                                idx===viewMonth?'bg-primary text-white shadow-sm':'text-slate-700 hover:bg-slate-100'
                                            }`}>
                                            {m}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex justify-center px-4 py-3 border-t border-slate-100">
                                <button type="button" onClick={(e)=>{sp(e);setView('calendar');}}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                    {language==='vi'?'← Quay lại':'← Back'}
                                </button>
                            </div>
                        </>}

                        {/* ── YEAR PICKER ── */}
                        {view==='year' && <>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                {navBtn('chevron_left', (e)=>{sp(e);setYearStart(s=>s-12);}, false, yearStart <= limitYear)}
                                <span className="text-sm font-bold text-slate-600">{yearStart} – {yearStart+11}</span>
                                {navBtn('chevron_right', (e)=>{sp(e);setYearStart(s=>s+12);})}
                            </div>
                            <div className="grid grid-cols-3 gap-2 p-4">
                                {years.map(yr=>{
                                    const isYearDisabled = yr < limitYear;
                                    return (
                                        <button key={yr} type="button" disabled={isYearDisabled}
                                            onClick={(e)=>{sp(e);setViewYear(yr);setView('month');}}
                                            className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                isYearDisabled ? 'text-slate-200 cursor-not-allowed' :
                                                yr===viewYear?'bg-primary text-white shadow-sm':'text-slate-700 hover:bg-slate-100'
                                            }`}>
                                            {yr}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex justify-center px-4 py-3 border-t border-slate-100">
                                <button type="button" onClick={(e)=>{sp(e);setView('month');}}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                    {language==='vi'?'← Quay lại':'← Back'}
                                </button>
                            </div>
                        </>}

                    </div>
                </div>
            )}
        </div>
    );
}
