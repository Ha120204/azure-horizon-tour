import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import type { Tone } from './types';
import { toneClass } from './constants';

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

export function SectionHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 className="font-headline text-base font-bold text-slate-900">{title}</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
            </div>
            <div className="shrink-0">{action}</div>
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    href,
    action,
}: {
    icon: string;
    title: string;
    description: string;
    href?: string;
    action?: string;
}) {
    return (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <span className="material-symbols-outlined text-[26px]" aria-hidden="true">{icon}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>
            {href && action ? (
                <Link href={href} className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                    {action}
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                </Link>
            ) : null}
        </div>
    );
}

export function WorkQueueRow({
    icon,
    label,
    value,
    helper,
    href,
    tone,
    meta,
}: {
    icon: string;
    label: string;
    value: number;
    helper: string;
    href: string;
    tone: 'amber' | 'orange' | 'teal';
    meta: string;
}) {
    const styles = {
        amber: {
            icon: 'bg-amber-50 text-amber-700',
            value: value > 0 ? 'text-amber-700' : 'text-slate-400',
            badge: value > 0 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-slate-100 text-slate-500 ring-slate-200',
        },
        orange: {
            icon: 'bg-orange-50 text-orange-700',
            value: value > 0 ? 'text-orange-700' : 'text-slate-400',
            badge: value > 0 ? 'bg-orange-50 text-orange-700 ring-orange-100' : 'bg-slate-100 text-slate-500 ring-slate-200',
        },
        teal: {
            icon: 'bg-teal-50 text-teal-700',
            value: value > 0 ? 'text-teal-700' : 'text-slate-400',
            badge: value > 0 ? 'bg-teal-50 text-teal-700 ring-teal-100' : 'bg-slate-100 text-slate-500 ring-slate-200',
        },
    }[tone];

    return (
        <Link
            href={href}
            aria-label={`${label}: ${value.toLocaleString('vi-VN')}. ${helper}`}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-blue-100 hover:bg-blue-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:grid-cols-[auto_minmax(0,1fr)_96px_112px_auto]"
        >
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${styles.icon}`}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{helper}</span>
            </span>
            <span className={`hidden justify-self-end font-headline text-2xl font-bold tracking-tight sm:block ${styles.value}`}>
                {value.toLocaleString('vi-VN')}
            </span>
            <span className={`hidden w-fit justify-self-end rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ring-1 sm:inline-flex ${styles.badge}`}>
                {meta}
            </span>
            <span className="flex items-center gap-2">
                <span className={`font-headline text-xl font-bold sm:hidden ${styles.value}`}>{value.toLocaleString('vi-VN')}</span>
                <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true">arrow_forward</span>
            </span>
        </Link>
    );
}

export function CompactMetricCard({
    icon,
    label,
    value,
    helper,
    href,
    tone,
}: {
    icon: string;
    label: string;
    value: number;
    helper: string;
    href: string;
    tone: Tone;
}) {
    const t = toneClass[tone];
    return (
        <Link
            href={href}
            aria-label={`${label}: ${value.toLocaleString('vi-VN')}. ${helper}`}
            className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.icon}`}>
                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </span>
                <span className="material-symbols-outlined text-[17px] text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true">arrow_forward</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
                <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
                    <span className="mt-1 block truncate text-xs font-medium text-slate-500">{helper}</span>
                </span>
                <span className="font-headline text-2xl font-bold tracking-tight text-slate-950">{value.toLocaleString('vi-VN')}</span>
            </div>
        </Link>
    );
}
