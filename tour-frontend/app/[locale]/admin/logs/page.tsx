'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/app/lib/constants';

interface UserInfo {
    id: number;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
}

interface ActivityLog {
    id: number;
    action: string;
    resource: string;
    resourceId: string | null;
    targetName: string | null;
    description: string;
    oldData: unknown;
    newData: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: UserInfo | null;
}

interface LogStats {
    total: number;
    todayCount: number;
    create: number;
    update: number;
    delete: number;
    login: number;
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    LOGIN: 'bg-slate-100 text-slate-600 border-slate-200',
    LOGOUT: 'bg-slate-100 text-slate-500 border-slate-200',
    ROLE_CHANGE: 'bg-amber-100 text-amber-700 border-amber-200',
    CANCEL_BOOKING: 'bg-orange-100 text-orange-700 border-orange-200',
    EXPORT: 'bg-violet-100 text-violet-700 border-violet-200',
};

const ACTION_LABELS: Record<string, string> = {
    CREATE: 'TẠO MỚI',
    UPDATE: 'CẬP NHẬT',
    DELETE: 'XÓA',
    LOGIN: 'ĐĂNG NHẬP',
    LOGOUT: 'ĐĂNG XUẤT',
    ROLE_CHANGE: 'ĐỔI QUYỀN',
    CANCEL_BOOKING: 'HỦY ĐƠN',
    EXPORT: 'XUẤT DỮ LIỆU',
};

type KpiFilter = 'all' | 'today' | 'CREATE' | 'UPDATE' | 'DELETE';
type AuditRecord = Record<string, unknown>;

interface AuditFieldRow {
    key: string;
    label: string;
    before?: string;
    after?: string;
}

const RESOURCE_LABELS: Record<string, string> = {
    Article: 'Bài viết',
    Booking: 'Đơn đặt tour',
    Review: 'Đánh giá',
    Subscriber: 'Subscriber',
    SupportTicket: 'Ticket hỗ trợ',
    Tour: 'Tour',
    TourDeparture: 'Lịch khởi hành',
    User: 'Người dùng',
    Voucher: 'Mã giảm giá',
};

const FIELD_LABELS: Record<string, string> = {
    accessCode: 'Mã truy cập',
    assignedStaffId: 'Nhân viên phụ trách',
    audience: 'Nhóm người nhận',
    body: 'Nội dung',
    bookingRef: 'Mã đặt chỗ',
    category: 'Danh mục',
    code: 'Mã',
    content: 'Nội dung',
    customerEmail: 'Email khách hàng',
    customerName: 'Tên khách hàng',
    customerPhone: 'Số điện thoại',
    departureDate: 'Ngày khởi hành',
    description: 'Mô tả',
    discountType: 'Loại giảm giá',
    discountValue: 'Giá trị giảm',
    duration: 'Thời lượng',
    email: 'Email',
    expiresAt: 'Ngày hết hạn',
    failedCount: 'Số lượt lỗi',
    featured: 'Nổi bật',
    fullName: 'Họ tên',
    isActive: 'Trạng thái',
    label: 'Tên hiển thị',
    maxUses: 'Số lượt dùng tối đa',
    message: 'Tin nhắn',
    minOrderValue: 'Giá trị đơn tối thiểu',
    name: 'Tên',
    phone: 'Số điện thoại',
    previewText: 'Đoạn xem trước',
    price: 'Giá',
    published: 'Đã xuất bản',
    rating: 'Điểm đánh giá',
    recipientEstimate: 'Số người nhận dự kiến',
    resourceId: 'Mã đối tượng',
    role: 'Vai trò',
    scheduledAt: 'Thời gian gửi',
    sentCount: 'Số lượt gửi',
    slug: 'Đường dẫn',
    status: 'Trạng thái',
    subject: 'Tiêu đề',
    title: 'Tiêu đề',
    totalPrice: 'Tổng tiền',
    type: 'Loại',
    usedCount: 'Số lượt đã dùng',
};

const HIDDEN_AUDIT_FIELDS = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'password',
    'accessToken',
    'refreshToken',
]);

const DETAIL_FIELD_PRIORITY = [
    'code',
    'label',
    'name',
    'title',
    'subject',
    'customerName',
    'customerEmail',
    'bookingRef',
    'status',
    'role',
    'category',
    'isActive',
    'discountType',
    'discountValue',
    'minOrderValue',
    'maxUses',
    'usedCount',
    'expiresAt',
    'price',
    'totalPrice',
    'rating',
    'scheduledAt',
];

const STATUS_VALUE_LABELS: Record<string, string> = {
    ACTIVE: 'Đang hoạt động',
    CANCELLED: 'Đã hủy',
    CONFIRMED: 'Đã xác nhận',
    DELETE: 'Xóa',
    DRAFT: 'Bản nháp',
    FAILED: 'Thất bại',
    FIXED_AMOUNT: 'Giảm tiền cố định',
    IN_PROGRESS: 'Đang xử lý',
    INACTIVE: 'Tạm dừng',
    NEW: 'Mới',
    PENDING: 'Chờ xử lý',
    PENDING_REVIEW: 'Chờ duyệt',
    PERCENT: 'Giảm theo phần trăm',
    PUBLISHED: 'Đã xuất bản',
    REJECTED: 'Bị từ chối',
    RESOLVED: 'Đã giải quyết',
    SCHEDULED: 'Đã lên lịch',
    SENDING: 'Đang gửi',
    SENT: 'Đã gửi',
    STAFF: 'Nhân viên',
    SUPER_ADMIN: 'Siêu quản trị',
    ADMIN: 'Quản trị viên',
};

const isAuditRecord = (value: unknown): value is AuditRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const stringifyComparable = (value: unknown) => JSON.stringify(value ?? null);

const getResourceLabel = (resource: string) => RESOURCE_LABELS[resource] ?? resource;

const getFieldLabel = (field: string) => FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

const formatDateTimeValue = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const formatMoney = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatAuditValue = (field: string, value: unknown, context?: AuditRecord) => {
    if (value === null || value === undefined || value === '') return 'Chưa có';
    if (typeof value === 'boolean') return value ? 'Đang bật' : 'Đã tắt';
    if (typeof value === 'number') {
        if (field === 'discountValue' && context?.discountType === 'PERCENT') return `${value}%`;
        if (['discountValue', 'minOrderValue', 'price', 'totalPrice', 'amount', 'refundAmount'].includes(field)) return formatMoney(value);
        return value.toLocaleString('vi-VN');
    }
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTimeValue(value);
        return STATUS_VALUE_LABELS[value] ?? value;
    }
    if (Array.isArray(value)) return `${value.length.toLocaleString('vi-VN')} mục`;
    if (isAuditRecord(value)) return 'Có dữ liệu chi tiết';
    return String(value);
};

const getRecordTitle = (log: ActivityLog) => {
    if (log.targetName) return log.targetName;
    const record = isAuditRecord(log.newData) ? log.newData : isAuditRecord(log.oldData) ? log.oldData : null;
    const candidate = record?.label ?? record?.name ?? record?.title ?? record?.subject ?? record?.code ?? record?.fullName ?? record?.email;
    return typeof candidate === 'string' && candidate.trim() ? candidate : `ID #${log.resourceId ?? log.id}`;
};

const getAuditSeverity = (log: ActivityLog) => {
    if (['DELETE', 'ROLE_CHANGE', 'CANCEL_BOOKING'].includes(log.action)) {
        return { label: 'Cần chú ý', className: 'bg-red-50 text-red-700 border-red-200', icon: 'priority_high' };
    }
    if (['Voucher', 'Booking', 'User', 'Tour'].includes(log.resource) || ['EXPORT'].includes(log.action)) {
        return { label: 'Quan trọng', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'warning' };
    }
    return { label: 'Bình thường', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'info' };
};

const getAuditSummary = (log: ActivityLog) => {
    const actor = log.user?.fullName || 'Hệ thống';
    const resourceLabel = getResourceLabel(log.resource).toLowerCase();
    const target = getRecordTitle(log);
    const quotedTarget = target ? ` "${target}"` : '';

    switch (log.action) {
        case 'CREATE':
            return `${actor} đã tạo ${resourceLabel}${quotedTarget}.`;
        case 'UPDATE':
            return `${actor} đã cập nhật ${resourceLabel}${quotedTarget}.`;
        case 'DELETE':
            return `${actor} đã xóa ${resourceLabel}${quotedTarget}.`;
        case 'LOGIN':
            return `${actor} đã đăng nhập vào hệ thống.`;
        case 'LOGOUT':
            return `${actor} đã đăng xuất khỏi hệ thống.`;
        case 'ROLE_CHANGE':
            return `${actor} đã thay đổi quyền truy cập của ${resourceLabel}${quotedTarget}.`;
        case 'CANCEL_BOOKING':
            return `${actor} đã hủy đơn đặt tour${quotedTarget}.`;
        case 'EXPORT':
            return `${actor} đã xuất dữ liệu ${resourceLabel}.`;
        default:
            return log.description || `${actor} đã thực hiện thao tác trên ${resourceLabel}${quotedTarget}.`;
    }
};

const getAuditImpactText = (log: ActivityLog) => {
    switch (log.action) {
        case 'CREATE':
            return `${getResourceLabel(log.resource)} mới đã được ghi nhận trong hệ thống.`;
        case 'UPDATE':
            return `Thông tin ${getResourceLabel(log.resource).toLowerCase()} đã thay đổi. Nên kiểm tra các trường bên dưới nếu thao tác ảnh hưởng tới khách hàng.`;
        case 'DELETE':
            return `${getResourceLabel(log.resource)} đã bị xóa hoặc vô hiệu hóa. Đây là thao tác cần rà soát khi phát sinh khiếu nại.`;
        case 'ROLE_CHANGE':
            return 'Quyền truy cập thay đổi có thể ảnh hưởng trực tiếp tới bảo mật và phân quyền vận hành.';
        case 'EXPORT':
            return 'Dữ liệu đã được xuất ra khỏi hệ thống. Cần đảm bảo người thực hiện có đúng thẩm quyền.';
        default:
            return 'Bản ghi này giúp xác định người thực hiện, thời điểm và đối tượng bị tác động.';
    }
};

const getSortedFields = (record: AuditRecord) => {
    const keys = Object.keys(record).filter(key => !HIDDEN_AUDIT_FIELDS.has(key));
    return keys.sort((a, b) => {
        const ia = DETAIL_FIELD_PRIORITY.indexOf(a);
        const ib = DETAIL_FIELD_PRIORITY.indexOf(b);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return a.localeCompare(b);
    });
};

const buildCreatedRows = (record: unknown): AuditFieldRow[] => {
    if (!isAuditRecord(record)) return [];
    return getSortedFields(record).map(key => ({
        key,
        label: getFieldLabel(key),
        after: formatAuditValue(key, record[key], record),
    }));
};

const buildChangedRows = (oldData: unknown, newData: unknown): AuditFieldRow[] => {
    if (!isAuditRecord(oldData) && !isAuditRecord(newData)) return [];
    const before = isAuditRecord(oldData) ? oldData : {};
    const after = isAuditRecord(newData) ? newData : {};
    const hasBefore = isAuditRecord(oldData);
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
        .filter(key => !HIDDEN_AUDIT_FIELDS.has(key))
        .filter(key => stringifyComparable(before[key]) !== stringifyComparable(after[key]));

    return keys.sort((a, b) => {
        const ia = DETAIL_FIELD_PRIORITY.indexOf(a);
        const ib = DETAIL_FIELD_PRIORITY.indexOf(b);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return a.localeCompare(b);
    }).map(key => ({
        key,
        label: getFieldLabel(key),
        before: hasBefore ? formatAuditValue(key, before[key], before) : undefined,
        after: formatAuditValue(key, after[key], after),
    }));
};

const buildAuditRows = (log: ActivityLog): AuditFieldRow[] => {
    if (log.action === 'CREATE') return buildCreatedRows(log.newData);
    if (log.action === 'DELETE') return buildCreatedRows(log.oldData || log.newData);
    return buildChangedRows(log.oldData, log.newData);
};

export default function SystemLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeShortcut, setActiveShortcut] = useState<string>('');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    // ── Quick date shortcuts ────────────────────────────────────────────────
    const applyShortcut = (key: string) => {
        const now = new Date();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const today = fmt(now);

        if (key === activeShortcut) {
            // Toggle off
            setDateFrom(''); setDateTo(''); setActiveShortcut('');
            setPage(1); return;
        }

        setActiveShortcut(key);
        setPage(1);

        if (key === 'today') {
            setDateFrom(today); setDateTo(today);
        } else if (key === '7d') {
            const from = new Date(now); from.setDate(from.getDate() - 6);
            setDateFrom(fmt(from)); setDateTo(today);
        } else if (key === '30d') {
            const from = new Date(now); from.setDate(from.getDate() - 29);
            setDateFrom(fmt(from)); setDateTo(today);
        } else if (key === 'month') {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            setDateFrom(fmt(from)); setDateTo(today);
        }
    };

    const clearDateFilter = () => {
        setDateFrom(''); setDateTo(''); setActiveShortcut(''); setPage(1);
    };

    const applyKpiFilter = (filter: KpiFilter) => {
        if (filter === 'all') {
            setSearch('');
            setActionFilter('');
            setDateFrom('');
            setDateTo('');
            setActiveShortcut('');
            setPage(1);
            return;
        }

        if (filter === 'today') {
            setActionFilter('');
            applyShortcut('today');
            return;
        }

        setActionFilter(current => current === filter ? '' : filter);
        setDateFrom('');
        setDateTo('');
        setActiveShortcut('');
        setPage(1);
    };

    const handleKpiKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, filter: KpiFilter) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        applyKpiFilter(filter);
    };

    const fetchLogs = async (currentPage: number, currentSearch: string, currentAction: string, from: string, to: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: '15',
            });
            if (currentSearch) queryParams.append('search', currentSearch);
            if (currentAction) queryParams.append('action', currentAction);
            if (from) queryParams.append('dateFrom', from);
            if (to)   queryParams.append('dateTo', to);

            const [logsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/logs?${queryParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/admin/logs/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (logsRes.ok) {
                const logsJson = await logsRes.json();
                // TransformInterceptor: { statusCode, message, data:[...], meta:{...}, timestamp }
                // data là array logs, meta là pagination - đều ở TOP LEVEL
                setLogs(Array.isArray(logsJson?.data) ? logsJson.data : []);
                setTotalPages(logsJson?.meta?.totalPages ?? 1);
                setTotalRecords(logsJson?.meta?.total ?? 0);
            }
            
            if (statsRes.ok) {
                const statsJson = await statsRes.json();
                // TransformInterceptor: { statusCode, message, data: statsObject, timestamp }
                setStats(statsJson?.data ?? null);
            }

        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce effect — re-fetch khi bất kỳ filter nào thay đổi
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs(page, search, actionFilter, dateFrom, dateTo);
        }, 400);
        return () => clearTimeout(timer);
    }, [page, search, actionFilter, dateFrom, dateTo]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset page on new search
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const queryParams = new URLSearchParams();
            if (search)       queryParams.append('search', search);
            if (actionFilter) queryParams.append('action', actionFilter);
            if (dateFrom)     queryParams.append('dateFrom', dateFrom);
            if (dateTo)       queryParams.append('dateTo', dateTo);

            const res = await fetch(`${API_BASE_URL}/admin/logs/export?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Export failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nhat-ky-he-thong-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Có lỗi xảy ra khi xuất dữ liệu!');
        } finally {
            setIsExporting(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'A';
        const parts = name.trim().split(' ');
        return parts.length >= 2 
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
    };

    return (
        <main className="flex-1 p-6 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto overflow-y-auto font-body bg-surface min-h-screen text-on-surface">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-outline-variant/20 pb-6">
                <div>
                    <h1 className="font-headline text-3xl font-bold text-primary tracking-tight leading-none mb-2">Nhật Ký Hành Động</h1>
                    <p className="font-body text-on-surface-variant text-sm">Theo dõi toàn bộ thao tác quản trị trên hệ thống</p>
                </div>
                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={!search && !actionFilter && !dateFrom && !dateTo}
                    onClick={() => applyKpiFilter('all')}
                    onKeyDown={(event) => handleKpiKeyDown(event, 'all')}
                    className={`bg-surface-container-lowest border p-4 rounded-xl shadow-sm cursor-pointer text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/25 ${
                        !search && !actionFilter && !dateFrom && !dateTo
                            ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/10'
                            : 'border-outline-variant/20 hover:border-primary/30 hover:bg-primary/5'
                    }`}
                >
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tổng cộng</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline">{stats?.total?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-outline">analytics</span>
                    </div>
                </div>
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeShortcut === 'today' && !actionFilter}
                    onClick={() => applyKpiFilter('today')}
                    onKeyDown={(event) => handleKpiKeyDown(event, 'today')}
                    className={`bg-emerald-50 border p-4 rounded-xl shadow-sm cursor-pointer text-left transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300/60 ${
                        activeShortcut === 'today' && !actionFilter
                            ? 'border-emerald-300 ring-2 ring-emerald-100'
                            : 'border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/50'
                    }`}
                >
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Hôm nay</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline text-emerald-700">+{stats?.todayCount?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-emerald-400">today</span>
                    </div>
                </div>
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={actionFilter === 'CREATE'}
                    onClick={() => applyKpiFilter('CREATE')}
                    onKeyDown={(event) => handleKpiKeyDown(event, 'CREATE')}
                    className={`bg-surface-container-lowest border p-4 rounded-xl shadow-sm cursor-pointer text-left transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300/50 ${
                        actionFilter === 'CREATE'
                            ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100'
                            : 'border-outline-variant/20 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                >
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tạo mới</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline">{stats?.create?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-emerald-500">add_circle</span>
                    </div>
                </div>
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={actionFilter === 'UPDATE'}
                    onClick={() => applyKpiFilter('UPDATE')}
                    onKeyDown={(event) => handleKpiKeyDown(event, 'UPDATE')}
                    className={`bg-surface-container-lowest border p-4 rounded-xl shadow-sm cursor-pointer text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-300/50 ${
                        actionFilter === 'UPDATE'
                            ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                            : 'border-outline-variant/20 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                >
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Cập nhật</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline">{stats?.update?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-blue-500">edit</span>
                    </div>
                </div>
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={actionFilter === 'DELETE'}
                    onClick={() => applyKpiFilter('DELETE')}
                    onKeyDown={(event) => handleKpiKeyDown(event, 'DELETE')}
                    className={`bg-surface-container-lowest border p-4 rounded-xl shadow-sm cursor-pointer text-left transition-all focus:outline-none focus:ring-2 focus:ring-red-300/50 ${
                        actionFilter === 'DELETE'
                            ? 'border-red-300 bg-red-50 ring-2 ring-red-100'
                            : 'border-outline-variant/20 hover:border-red-300 hover:bg-red-50'
                    }`}
                >
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Xóa</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-headline text-red-600">{stats?.delete?.toLocaleString() || 0}</span>
                        <span className="material-symbols-outlined text-red-500">delete</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface-container-lowest rounded-xl p-3 mb-3 flex flex-col md:flex-row gap-3 border border-outline-variant/20 shadow-sm">
                {/* Search */}
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearchChange}
                        className="w-full bg-surface border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-outline"
                        placeholder="Tìm theo nội dung, tên đối tượng..."
                    />
                </div>
                <div className="w-px bg-outline-variant/20 hidden md:block" />
                {/* Action filter */}
                <div className="relative min-w-[190px]">
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="w-full bg-surface border-none rounded-lg pl-4 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Tất cả hành động</option>
                        <option value="CREATE">Tạo mới (CREATE)</option>
                        <option value="UPDATE">Cập nhật (UPDATE)</option>
                        <option value="DELETE">Xóa (DELETE)</option>
                        <option value="LOGIN">Đăng nhập (LOGIN)</option>
                        <option value="LOGOUT">Đăng xuất (LOGOUT)</option>
                        <option value="ROLE_CHANGE">Đổi quyền (ROLE_CHANGE)</option>
                        <option value="CANCEL_BOOKING">Hủy đơn (CANCEL_BOOKING)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="bg-surface-container-lowest rounded-xl px-3 py-2.5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-outline-variant/20 shadow-sm">
                {/* Quick shortcuts */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="material-symbols-outlined text-outline text-[17px]">calendar_month</span>
                    {[
                        { key: 'today', label: 'Hôm nay' },
                        { key: '7d',   label: '7 ngày' },
                        { key: '30d',  label: '30 ngày' },
                        { key: 'month',label: 'Tháng này' },
                    ].map(s => (
                        <button
                            key={s.key}
                            onClick={() => applyShortcut(s.key)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                activeShortcut === s.key
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-surface text-on-surface-variant border-outline-variant/30 hover:border-primary/40 hover:text-primary'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="w-px bg-outline-variant/20 hidden sm:block h-6" />

                {/* Custom date range */}
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-outline absolute -top-2 left-3 bg-surface-container-lowest px-1">Từ ngày</label>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || new Date().toISOString().split('T')[0]}
                            onChange={e => { setDateFrom(e.target.value); setActiveShortcut(''); setPage(1); }}
                            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                        />
                    </div>
                    <span className="text-outline text-sm font-medium flex-shrink-0">—</span>
                    <div className="relative flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-outline absolute -top-2 left-3 bg-surface-container-lowest px-1">Đến ngày</label>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => { setDateTo(e.target.value); setActiveShortcut(''); setPage(1); }}
                            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                        />
                    </div>

                    {/* Active filter chip + clear */}
                    {(dateFrom || dateTo) && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-1 rounded-full border border-primary/20 whitespace-nowrap">
                                {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `Từ ${dateFrom}` : `Đến ${dateTo}`}
                            </span>
                            <button
                                onClick={clearDateFilter}
                                title="Xóa lọc thời gian"
                                className="w-6 h-6 rounded-full bg-outline-variant/20 hover:bg-error/10 hover:text-error text-outline flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-label text-[11px] uppercase tracking-wider">
                                <th className="py-3 px-4 w-10"></th>
                                <th className="py-3 px-4 font-semibold">Thời Gian</th>
                                <th className="py-3 px-4 font-semibold">Người Thực Hiện</th>
                                <th className="py-3 px-4 font-semibold">Hành Động</th>
                                <th className="py-3 px-4 font-semibold">Đối Tượng</th>
                                <th className="py-3 px-4 font-semibold hidden lg:table-cell">Mức độ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-4"><div className="w-4 h-4 bg-outline-variant/20 rounded"></div></td>
                                        <td className="py-4 px-4"><div className="w-24 h-4 bg-outline-variant/20 rounded"></div></td>
                                        <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-outline-variant/20"></div><div className="w-32 h-4 bg-outline-variant/20 rounded"></div></div></td>
                                        <td className="py-4 px-4"><div className="w-20 h-5 bg-outline-variant/20 rounded-full"></div></td>
                                        <td className="py-4 px-4"><div className="w-48 h-4 bg-outline-variant/20 rounded"></div></td>
                                        <td className="py-4 px-4 hidden lg:table-cell"><div className="w-24 h-4 bg-outline-variant/20 rounded"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-outline">
                                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-50">search_off</span>
                                        <p className="text-sm font-medium">Không tìm thấy nhật ký nào phù hợp</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const summary = getAuditSummary(log);
                                    const severity = getAuditSeverity(log);
                                    const changedRows = buildAuditRows(log);
                                    const resourceLabel = getResourceLabel(log.resource);
                                    const targetTitle = getRecordTitle(log);
                                    const hasBeforeData = log.action === 'UPDATE' && isAuditRecord(log.oldData);

                                    return (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                            className="hover:bg-surface-container-low/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-3 px-4 text-outline group-hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedRow === log.id ? 'rotate(90deg)' : 'rotate(0)' }}>
                                                    chevron_right
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-xs font-semibold text-on-surface whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-[11px] text-outline mt-0.5 whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    {log.user ? (
                                                        log.user.avatarUrl ? (
                                                            <img src={log.user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-outline-variant/20" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                                {getInitials(log.user.fullName)}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                            <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-on-surface leading-tight">{log.user?.fullName || 'System Automated'}</span>
                                                        <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">{log.user?.role || 'SYSTEM'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${ACTION_COLORS[log.action] || ACTION_COLORS['LOGIN']}`}>
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="max-w-xl" title={summary}>
                                                    <p className="line-clamp-1 text-sm font-semibold text-on-surface">{summary}</p>
                                                    <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-outline">{resourceLabel} · {targetTitle}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${severity.className}`}>
                                                    <span className="material-symbols-outlined text-[13px]">{severity.icon}</span>
                                                    {severity.label}
                                                </span>
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Row Content */}
                                        {expandedRow === log.id && (
                                            <tr className="bg-surface-container-low/30 border-b border-outline-variant/20">
                                                <td colSpan={6} className="p-0">
                                                    <div className="px-8 py-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                                            <section className="rounded-2xl border border-outline-variant/25 bg-surface p-5 shadow-sm">
                                                                <div className="flex items-start gap-3">
                                                                    <span className={`material-symbols-outlined grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-[20px] ${severity.className}`}>
                                                                        {severity.icon}
                                                                    </span>
                                                                    <div>
                                                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-outline">Tóm tắt nghiệp vụ</p>
                                                                        <h4 className="mt-1 text-lg font-black leading-7 text-on-surface">{summary}</h4>
                                                                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{getAuditImpactText(log)}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                    {[
                                                                        ['Đối tượng', `${resourceLabel} · ${targetTitle}`],
                                                                        ['Người thực hiện', log.user?.fullName || 'Hệ thống'],
                                                                        ['Email', log.user?.email || '—'],
                                                                        ['Thời gian', new Date(log.createdAt).toLocaleString('vi-VN')],
                                                                        ['IP', log.ipAddress || '—'],
                                                                        ['Mã bản ghi', log.resourceId || `Log #${log.id}`],
                                                                    ].map(([label, value]) => (
                                                                        <div key={label} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2">
                                                                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-outline">{label}</p>
                                                                            <p className="mt-1 break-words text-sm font-semibold text-on-surface">{value}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </section>

                                                            <section className="rounded-2xl border border-outline-variant/25 bg-surface p-5 shadow-sm">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                                                                        <span className="material-symbols-outlined text-[17px]">difference</span>
                                                                        {log.action === 'UPDATE' ? 'Thông tin được cập nhật' : log.action === 'DELETE' ? 'Thông tin trước khi xóa' : 'Thông tin được ghi nhận'}
                                                                    </h4>
                                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${severity.className}`}>{severity.label}</span>
                                                                </div>

                                                                {changedRows.length > 0 ? (
                                                                    <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/20">
                                                                        <table className="w-full text-sm">
                                                                            <thead className="bg-surface-container-low text-[10px] uppercase tracking-[0.12em] text-outline">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left font-black">Thông tin</th>
                                                                                    {hasBeforeData && <th className="px-3 py-2 text-left font-black">Trước</th>}
                                                                                    <th className="px-3 py-2 text-left font-black">{hasBeforeData ? 'Sau' : log.action === 'UPDATE' ? 'Giá trị mới' : 'Giá trị'}</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-outline-variant/10">
                                                                                {changedRows.map(row => (
                                                                                    <tr key={row.key} className="align-top">
                                                                                        <td className="w-44 px-3 py-3 font-bold text-on-surface">{row.label}</td>
                                                                                        {hasBeforeData && <td className="px-3 py-3 text-on-surface-variant">{row.before}</td>}
                                                                                        <td className="px-3 py-3 font-semibold text-on-surface">{row.after}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-4 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest p-5 text-center text-sm text-outline">
                                                                        Không có dữ liệu thay đổi thân thiện để hiển thị.
                                                                    </div>
                                                                )}

                                                                <details className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
                                                                    <summary className="cursor-pointer px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">
                                                                        Chi tiết kỹ thuật
                                                                    </summary>
                                                                    <div className="space-y-3 border-t border-outline-variant/20 p-4">
                                                                        <div>
                                                                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-outline">User Agent</p>
                                                                            <p className="mt-1 break-words text-xs font-medium text-on-surface-variant">{log.userAgent || '—'}</p>
                                                                        </div>
                                                                        <div className="grid gap-3 lg:grid-cols-2">
                                                                            <div className="overflow-x-auto rounded-lg bg-[#fff1f2] p-3">
                                                                                <p className="mb-2 text-[10px] font-black uppercase text-red-700">Old Data</p>
                                                                                <pre className="m-0 text-[11px] text-red-950">{log.oldData ? JSON.stringify(log.oldData, null, 2) : 'Không có'}</pre>
                                                                            </div>
                                                                            <div className="overflow-x-auto rounded-lg bg-[#ecfdf5] p-3">
                                                                                <p className="mb-2 text-[10px] font-black uppercase text-emerald-700">New Data</p>
                                                                                <pre className="m-0 text-[11px] text-emerald-950">{log.newData ? JSON.stringify(log.newData, null, 2) : 'Không có'}</pre>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </details>
                                                            </section>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                <div className="bg-surface-container-lowest border-t border-outline-variant/20 px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">
                        Hiển thị <span className="font-semibold text-on-surface">{logs.length}</span> / <span className="font-semibold text-on-surface">{totalRecords}</span> bản ghi
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <span className="px-3 font-semibold text-primary">Trang {page} / {totalPages || 1}</span>
                        <button 
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
