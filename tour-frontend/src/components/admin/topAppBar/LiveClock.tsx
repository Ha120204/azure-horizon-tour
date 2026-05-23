'use client';
import { useState, useEffect } from 'react';

export default function LiveClock() {
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
            setDate(now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));
        };
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, []);

    if (!time) return null;

    return (
        <div className="hidden xl:flex flex-col items-end leading-tight select-none">
            <span className="text-sm font-bold text-slate-700 tracking-wider tabular-nums" style={{ fontVariant: 'tabular-nums', letterSpacing: '0.05em' }}>{time}</span>
            <span className="text-[10px] text-slate-400 font-medium capitalize">{date}</span>
        </div>
    );
}
