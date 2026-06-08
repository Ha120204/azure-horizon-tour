import {
    AUDIT_LOCALE,
    AUDIT_TIME_ZONE,
    DETAIL_FIELD_PRIORITY,
    FIELD_LABELS,
    HIDDEN_AUDIT_FIELDS,
    RESOURCE_LABELS,
    STATUS_VALUE_LABELS,
} from './config';
import type { ActivityLog, AuditRecord, AuditRowsResult, AuditSeverity } from './types';

export const isAuditRecord = (value: unknown): value is AuditRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const stringifyComparable = (value: unknown) => JSON.stringify(value ?? null);

export const getResourceLabel = (resource: string) => RESOURCE_LABELS[resource] ?? resource;

export const getFieldLabel = (field: string) =>
    FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

export const formatDateTimeValue = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(AUDIT_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: AUDIT_TIME_ZONE,
        timeZoneName: 'short',
    }).format(date);
};

export const formatAuditDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(AUDIT_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: AUDIT_TIME_ZONE,
    }).format(date);
};

export const formatAuditTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(AUDIT_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: AUDIT_TIME_ZONE,
        timeZoneName: 'short',
    }).format(date);
};

export const getUserInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
};

const formatMoney = (value: number) =>
    new Intl.NumberFormat(AUDIT_LOCALE, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const isEmptyAuditValue = (value: unknown) =>
    value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

export const formatAuditValue = (field: string, value: unknown, context?: AuditRecord) => {
    if (value === null || value === undefined || value === '') return 'Chưa có';
    if (typeof value === 'boolean') return value ? 'Đang bật' : 'Đã tắt';
    if (typeof value === 'number') {
        if (field === 'discountValue' && context?.discountType === 'PERCENT') return `${value}%`;
        if (['discountValue', 'minOrderValue', 'price', 'totalPrice', 'amount', 'refundAmount'].includes(field)) return formatMoney(value);
        return value.toLocaleString(AUDIT_LOCALE);
    }
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTimeValue(value);
        return STATUS_VALUE_LABELS[value] ?? value;
    }
    if (Array.isArray(value)) return `${value.length.toLocaleString(AUDIT_LOCALE)} mục`;
    if (isAuditRecord(value)) return 'Có dữ liệu chi tiết';
    return String(value);
};

export const getRecordTitle = (log: ActivityLog) => {
    if (log.targetName) return log.targetName;
    const record = isAuditRecord(log.newData) ? log.newData : isAuditRecord(log.oldData) ? log.oldData : null;
    const candidate = record?.label ?? record?.name ?? record?.title ?? record?.subject ?? record?.code ?? record?.fullName ?? record?.email;
    return typeof candidate === 'string' && candidate.trim() ? candidate : `ID #${log.resourceId ?? log.id}`;
};

export const getAuditSeverity = (log: ActivityLog): AuditSeverity => {
    if (['ROLE_CHANGE', 'EXPORT'].includes(log.action)) {
        return { label: 'Nghiêm trọng', className: 'bg-red-50 text-red-700 border-red-200', icon: 'gpp_maybe' };
    }

    if (['DELETE', 'CANCEL_BOOKING'].includes(log.action)) {
        return { label: 'Cần chú ý', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'priority_high' };
    }

    if (['Booking', 'User', 'Voucher', 'Tour'].includes(log.resource) && log.action === 'UPDATE') {
        return { label: 'Quan trọng', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'warning' };
    }

    return { label: 'Bình thường', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'info' };
};

export const getAuditSummary = (log: ActivityLog) => {
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

export const getAuditImpactText = (log: ActivityLog) => {
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

const buildCreatedRows = (record: unknown): AuditRowsResult => {
    if (!isAuditRecord(record)) return { visibleRows: [], hiddenEmptyCount: 0, totalRows: 0 };

    const rows = getSortedFields(record).map(key => ({
        key,
        label: getFieldLabel(key),
        after: formatAuditValue(key, record[key], record),
    }));

    const visibleRows = rows.filter(row => !isEmptyAuditValue(record[row.key]));

    return {
        visibleRows,
        hiddenEmptyCount: rows.length - visibleRows.length,
        totalRows: rows.length,
    };
};

const buildChangedRows = (oldData: unknown, newData: unknown): AuditRowsResult => {
    if (!isAuditRecord(oldData) && !isAuditRecord(newData)) {
        return { visibleRows: [], hiddenEmptyCount: 0, totalRows: 0 };
    }

    const before = isAuditRecord(oldData) ? oldData : {};
    const after = isAuditRecord(newData) ? newData : {};
    const hasBefore = isAuditRecord(oldData);
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
        .filter(key => !HIDDEN_AUDIT_FIELDS.has(key))
        .filter(key => stringifyComparable(before[key]) !== stringifyComparable(after[key]));

    const visibleRows = keys.sort((a, b) => {
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

    return {
        visibleRows,
        hiddenEmptyCount: 0,
        totalRows: visibleRows.length,
    };
};

export const buildAuditRows = (log: ActivityLog): AuditRowsResult => {
    if (log.action === 'CREATE') return buildCreatedRows(log.newData);
    if (log.action === 'DELETE') return buildCreatedRows(log.oldData || log.newData);
    return buildChangedRows(log.oldData, log.newData);
};

export const getResourceHref = (log: ActivityLog) => {
    const resourcePath: Record<string, string> = {
        Article: '/admin/articles',
        Booking: '/admin/bookings',
        Review: '/admin/reviews',
        SupportTicket: '/admin/support',
        Tour: '/admin/tours',
        TourDeparture: '/admin/tours',
        User: '/admin/customers',
        Voucher: '/admin/vouchers',
    };

    return resourcePath[log.resource] ?? null;
};

export const writeClipboardText = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback below handles localhost/HTTP and browser policy edge cases.
        }
    }

    if (typeof document === 'undefined') return false;

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        document.body.removeChild(textArea);
    }
};
