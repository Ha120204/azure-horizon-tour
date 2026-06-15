'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { formatDateTime, formatShortVND, formatVND, getStatusMeta, toneStyles } from '../_lib/helpers';
import type { OverviewData, Tone } from '../_lib/types';

function SeverityBadge({ severity }: { severity: string }) {
    const isCritical = severity === 'Critical';
    return (
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold ${isCritical ? toneStyles.red.badge : toneStyles.amber.badge}`}>
            {severity}
        </span>
    );
}

function KpiCard({
    label,
    value,
    change,
    note,
    icon,
    toneName,
    gradient,
}: {
    label: string;
    value: string;
    change: string;
    note: string;
    icon: string;
    toneName: Tone;
    gradient?: boolean;
}) {
    const tone = toneStyles[toneName];

    if (gradient) {
        return (
            <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                <div className="relative z-10">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                            <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                        </div>
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">{change}</span>
                    </div>
                    <p className="text-sm font-medium text-white/75">{label}</p>
                    <h3 className="mt-1.5 font-headline text-3xl font-bold tracking-tight">{value}</h3>
                    <p className="mt-1.5 text-xs text-white/60">{note}</p>
                </div>
            </article>
        );
    }

    return (
        <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
            <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${tone.soft} opacity-70 blur-2xl`} />
            <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.icon}`}>
                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tone.badge}`}>{change}</span>
                </div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <h3 className={`mt-1.5 font-headline text-3xl font-bold tracking-tight ${toneName === 'red' || toneName === 'amber' ? tone.text : 'text-slate-800'}`}>{value}</h3>
                <p className="mt-1.5 text-xs text-slate-400">{note}</p>
            </div>
        </article>
    );
}

function SectionCard({ title, subtitle, icon, accent, children, action }: {
    title: string;
    subtitle?: string;
    icon: string;
    accent: Tone;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyles[accent].icon}`}>
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <div>
                        <h2 className="font-headline text-base font-bold text-slate-800">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="p-6">{children}</div>
        </section>
    );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export function SuperLoadingState() {
    return (
        <main className="flex-1 bg-slate-50 px-8 pb-16 pt-8">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
                <SkeletonBlock className="h-56" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-24" />)}
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-44" />)}
                </div>
                <SkeletonBlock className="h-80" />
            </div>
        </main>
    );
}

export function SuperErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <main className="flex-1 bg-slate-50 px-8 pb-16 pt-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <span className="material-symbols-outlined text-[28px]" aria-hidden="true">error</span>
                </div>
                <h1 className="mt-5 font-headline text-xl font-bold text-slate-800">Không tải được Super Overview</h1>
                <p className="mt-2 text-sm text-slate-500">{message}</p>
                <button onClick={onRetry} className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700">
                    Thử lại
                </button>
            </div>
        </main>
    );
}

type RiskWorkflowStatus = 'OPEN' | 'REVIEWED' | 'RESOLVED';

const WORKFLOW_META: Record<RiskWorkflowStatus, { label: string; badge: string; next: RiskWorkflowStatus | null; actionLabel: string }> = {
    OPEN:     { label: 'Chưa xử lý',   badge: 'border-red-100 bg-red-50 text-red-600',       next: 'REVIEWED', actionLabel: 'Đánh dấu đã xem' },
    REVIEWED: { label: 'Đã xem xét',   badge: 'border-blue-100 bg-blue-50 text-blue-700',    next: 'RESOLVED', actionLabel: 'Đóng rủi ro' },
    RESOLVED: { label: 'Đã đóng',      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700', next: null, actionLabel: '' },
};

interface SuperOverviewContentProps {
    data: OverviewData;
    isExporting: boolean;
    onRefresh: () => void;
    onExportAudit: () => void;
    onUpdateRisk: (key: string, status: 'REVIEWED' | 'RESOLVED') => Promise<void>;
}

export function SuperOverviewContent({ data, isExporting, onRefresh, onExportAudit, onUpdateRisk }: SuperOverviewContentProps) {
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const statusMeta = getStatusMeta(data.status);
    const statusTone = toneStyles[statusMeta.tone];
    const alerts = [
        { label: 'Thanh toán lỗi', value: data.alerts.failedPayments, detail: 'giao dịch cần đối soát', icon: 'credit_card_off', tone: 'red' as Tone },
        { label: 'Booking quá hạn', value: data.alerts.overduePendingBookings, detail: 'quá SLA xác nhận', icon: 'timer', tone: 'amber' as Tone },
        { label: 'Hành động nhạy cảm', value: data.alerts.sensitiveActionsToday, detail: 'cần rà soát quyền', icon: 'shield', tone: 'red' as Tone },
        { label: 'Nội dung chờ duyệt', value: data.alerts.pendingContent, detail: `${data.alerts.pendingTours} tour · ${data.alerts.pendingArticles} bài viết`, icon: 'pending_actions', tone: 'blue' as Tone },
    ];
    const kpis = [
        { label: 'Doanh thu tháng', value: formatShortVND(data.kpis.monthlyRevenue), change: 'Tháng này', note: formatVND(data.kpis.monthlyRevenue), icon: 'payments', tone: 'blue' as Tone, gradient: true },
        { label: 'Admin hoạt động', value: data.kpis.activeAdmins.toLocaleString('vi-VN'), change: `${data.kpis.roleChangesToday} role đổi`, note: `${data.kpis.totalAdminAccounts} tài khoản quản trị`, icon: 'admin_panel_settings', tone: 'violet' as Tone },
        { label: 'Cần can thiệp', value: data.kpis.interventionRequired.toLocaleString('vi-VN'), change: `${data.alerts.supportOverdue} quá hạn`, note: 'việc chưa đóng', icon: 'priority_high', tone: 'amber' as Tone },
        { label: 'Tỉ lệ thanh toán lỗi', value: `${data.kpis.failedPaymentRate}%`, change: `${data.alerts.failedPayments} lỗi`, note: 'trên nhóm chưa/không thanh toán', icon: 'credit_card_off', tone: 'red' as Tone },
    ];
    const secondaryStats = [
        { label: 'Audit hôm nay', value: data.kpis.auditEventsToday.toLocaleString('vi-VN'), icon: 'history', tone: 'blue' as Tone },
        { label: 'High-risk events', value: data.kpis.highRiskEventsToday.toLocaleString('vi-VN'), icon: 'warning', tone: 'amber' as Tone },
        { label: 'Hỗ trợ đang mở', value: data.kpis.supportEscalations.toLocaleString('vi-VN'), icon: 'support_agent', tone: 'red' as Tone },
        { label: 'Draft chờ duyệt', value: data.alerts.assistedDraftPending.toLocaleString('vi-VN'), icon: 'approval_delegation', tone: 'emerald' as Tone },
    ];

    return (
        <main className="flex-1 bg-slate-50 px-8 pb-16 pt-8">
            <div className="mx-auto w-full max-w-[1600px]">
                <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-50 blur-3xl" />
                        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-500/20">
                                        <span className="material-symbols-outlined text-[17px] text-white" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Super Admin</span>
                                </div>
                                <h1 className="font-headline text-[2rem] font-bold leading-tight tracking-tight text-slate-800">Kiểm soát rủi ro hệ thống</h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Dữ liệu thật từ booking, audit log, phân quyền, nội dung và hỗ trợ khách hàng.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:w-[320px]">
                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Risk index</p>
                                    <p className="mt-2 font-headline text-3xl font-bold text-amber-700">{data.riskIndex}</p>
                                    <p className="mt-1 text-xs font-medium text-amber-700/75">Tính từ tín hiệu rủi ro</p>
                                </div>
                                <div className={`rounded-2xl border p-4 ${statusTone.soft} ${statusTone.border}`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone.text}`}>Trạng thái</p>
                                    <p className={`mt-2 font-headline text-xl font-bold ${statusTone.text}`}>{statusMeta.label}</p>
                                    <p className={`mt-2 text-xs font-medium ${statusTone.text}/75`}>{formatDateTime(data.generatedAt)}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cập nhật lần cuối</p>
                                <h2 className="mt-3 font-headline text-xl font-bold text-slate-800">{formatDateTime(data.generatedAt)}</h2>
                                <p className="mt-1 text-sm text-slate-500">Dữ liệu thời gian thực từ hệ thống</p>
                            </div>
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                            </span>
                        </div>
                        <button onClick={onRefresh} className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
                            Làm mới dữ liệu
                        </button>
                    </section>
                </div>

                <section className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
                    {alerts.map(alert => {
                        const tone = toneStyles[alert.tone];
                        return (
                            <article key={alert.label} className={`rounded-xl border p-4 ${tone.soft} ${tone.border}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 ${tone.text}`}>
                                        <span className="material-symbols-outlined text-[19px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{alert.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-bold ${tone.text}`}>{alert.label} ({alert.value})</p>
                                        <p className="mt-1 text-xs font-medium text-slate-500">{alert.detail}</p>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map(item => <KpiCard key={item.label} {...item} toneName={item.tone} />)}
                </section>

                <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {secondaryStats.map(stat => {
                        const tone = toneStyles[stat.tone];
                        return (
                            <div key={stat.label} className={`rounded-2xl border bg-white p-4 shadow-sm ${tone.border}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400">{stat.label}</p>
                                        <p className={`mt-1 font-headline text-2xl font-bold ${tone.text}`}>{stat.value}</p>
                                    </div>
                                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}>
                                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </section>

                <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
                    <SectionCard title="Hàng đợi rủi ro vận hành" subtitle="Ưu tiên các vụ việc ảnh hưởng tiền, quyền và niềm tin khách hàng." icon="priority_high" accent="red" action={<span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">{data.operationalRisks.length} việc gấp</span>}>
                        {data.operationalRisks.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                                <p className="font-semibold text-slate-700">Chưa có rủi ro vận hành cần xử lý.</p>
                                <p className="mt-1 text-sm text-slate-400">Các tín hiệu payment, booking, support và audit đang trong ngưỡng ổn định.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.operationalRisks.map(item => {
                                    const tone = toneStyles[item.tone];
                                    return (
                                        <article key={item.key} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm md:flex-row md:items-start">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
                                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <SeverityBadge severity={item.severity} />
                                                    <span className="text-xs font-semibold text-slate-400">{item.due}</span>
                                                    {item.workflow && (
                                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${WORKFLOW_META[item.workflow.status as RiskWorkflowStatus].badge}`}>
                                                            {WORKFLOW_META[item.workflow.status as RiskWorkflowStatus].label}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="mt-2 text-sm font-bold text-slate-800">{item.title}</h3>
                                                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{item.detail}</p>
                                                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Owner · {item.owner}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                                {item.workflow && WORKFLOW_META[item.workflow.status as RiskWorkflowStatus].next && (
                                                    <button
                                                        onClick={async () => {
                                                            const next = WORKFLOW_META[item.workflow.status as RiskWorkflowStatus].next as 'REVIEWED' | 'RESOLVED';
                                                            setUpdatingKey(item.key);
                                                            await onUpdateRisk(item.key, next);
                                                            setUpdatingKey(null);
                                                        }}
                                                        disabled={updatingKey === item.key}
                                                        className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                    >
                                                        {updatingKey === item.key
                                                            ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                                                            : <span className="material-symbols-outlined text-[15px]">check</span>
                                                        }
                                                        {WORKFLOW_META[item.workflow.status as RiskWorkflowStatus].actionLabel}
                                                    </button>
                                                )}
                                                <Link href={item.href} className="flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                    Xem log
                                                </Link>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Sức khỏe hệ thống" subtitle="Các dịch vụ lõi phục vụ booking và audit." icon="monitor_heart" accent="emerald">
                        <div className="space-y-3">
                            {data.systemHealth.map(item => {
                                const tone = toneStyles[item.tone];
                                return (
                                    <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{item.label}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">{item.meta}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} aria-hidden="true" />
                                            {item.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                </div>

                <SectionCard title="Nhật ký hành động rủi ro cao" subtitle="Dữ liệu thật từ SystemLog, ưu tiên role change, export, delete và booking/user/voucher." icon="history" accent="blue" action={
                    <button onClick={onExportAudit} disabled={isExporting} className="hidden h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-60 md:inline-flex">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{isExporting ? 'progress_activity' : 'download'}</span>
                        {isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}
                    </button>
                }>
                    {data.highRiskActions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                            <p className="font-semibold text-slate-700">Chưa có hành động rủi ro cao.</p>
                            <p className="mt-1 text-sm text-slate-400">Khi có đổi quyền, export, xóa dữ liệu hoặc hủy booking, hệ thống sẽ hiển thị tại đây.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[920px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                        {['Người thực hiện', 'Hành động', 'Tài nguyên', 'Mức độ', 'Địa chỉ IP', 'Thời gian'].map(header => (
                                            <th key={header} className="pb-3 font-bold">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {data.highRiskActions.map(row => (
                                        <tr key={row.id} className="transition-colors hover:bg-slate-50">
                                            <td className="py-4">
                                                <p className="font-bold text-slate-800">{row.actor}</p>
                                                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{row.actorRole}</p>
                                            </td>
                                            <td className="py-4 font-medium text-slate-700">{row.action}</td>
                                            <td className="py-4 text-slate-500">{row.resource}</td>
                                            <td className="py-4"><SeverityBadge severity={row.severity} /></td>
                                            <td className="py-4 font-mono text-xs text-slate-500">{row.ip}</td>
                                            <td className="py-4 text-slate-500">{formatDateTime(row.time)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>


            </div>
        </main>
    );
}
