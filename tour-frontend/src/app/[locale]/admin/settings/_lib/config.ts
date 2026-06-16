import type { SettingsPanel, SystemHealthStatus } from './types';

// Impact text và risky flag là presentation concerns — chỉ tồn tại ở FE.
// Constraints (type/min/max/maxLength/required) lấy từ GET /settings/meta (backend là nguồn duy nhất).
export const SETTING_DISPLAY_META: Record<string, { impact: string; risky?: boolean }> = {
    company_name: { impact: 'Hiển thị ở header, footer và email hệ thống.' },
    company_address: { impact: 'Dùng trong thông tin liên hệ và chứng từ gửi khách.' },
    company_phone: { impact: 'Hiển thị ở email vé và kênh hỗ trợ khách hàng.' },
    company_email: { impact: 'Email hỗ trợ khách hàng và biểu mẫu liên hệ.' },
    company_description: { impact: 'Ảnh hưởng nội dung giới thiệu thương hiệu.' },
    booking_hold_minutes: { impact: 'Ảnh hưởng trực tiếp thời gian giữ ghế trước thanh toán.', risky: true },
    booking_max_people: { impact: 'Giới hạn số khách tối đa trong một lượt đặt.', risky: true },
    booking_min_people: { impact: 'Giới hạn số khách tối thiểu trong một lượt đặt.', risky: true },
};

export const PANEL_META: Record<SettingsPanel, { title: string; subtitle: string; icon: string; iconBg: string; iconColor: string; kind: 'editable' | 'info' }> = {
    company: {
        title: 'Thông tin công ty',
        subtitle: 'Hiển thị trên email, vé điện tử và các tài liệu hệ thống.',
        icon: 'business', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', kind: 'editable',
    },
    booking: {
        title: 'Chính sách đặt tour',
        subtitle: 'Các quy tắc kinh doanh áp dụng cho quy trình đặt tour.',
        icon: 'policy', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', kind: 'editable',
    },
    runtime: {
        title: 'Trạng thái hệ thống',
        subtitle: 'Kiểm tra nhanh API, database, xác thực và các dịch vụ tích hợp.',
        icon: 'cloud_sync', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', kind: 'info',
    },
    security: {
        title: 'Bảo mật & Xác thực',
        subtitle: 'Cấu hình JWT và rate limiting - chỉnh sửa trong file .env.',
        icon: 'security', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', kind: 'info',
    },
    payment: {
        title: 'Cổng thanh toán',
        subtitle: 'API keys lưu trong .env - không hiển thị vì lý do bảo mật.',
        icon: 'payments', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', kind: 'info',
    },
    email: {
        title: 'Hệ thống Email',
        subtitle: 'Cấu hình gửi email tự động cho giao dịch và tài khoản.',
        icon: 'mail', iconBg: 'bg-rose-50', iconColor: 'text-rose-600', kind: 'info',
    },
};

export const HEALTH_TONE: Record<SystemHealthStatus, {
    label: string;
    icon: string;
    chip: string;
    tile: string;
    iconWrap: string;
    iconText: string;
}> = {
    ok: {
        label: 'Ổn định',
        icon: 'check_circle',
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        tile: 'bg-emerald-50/60 border-emerald-100',
        iconWrap: 'bg-emerald-100',
        iconText: 'text-emerald-700',
    },
    warning: {
        label: 'Cần chú ý',
        icon: 'warning',
        chip: 'bg-amber-50 text-amber-700 border-amber-200',
        tile: 'bg-amber-50/60 border-amber-100',
        iconWrap: 'bg-amber-100',
        iconText: 'text-amber-700',
    },
    error: {
        label: 'Có lỗi',
        icon: 'error',
        chip: 'bg-red-50 text-red-700 border-red-200',
        tile: 'bg-red-50/70 border-red-100',
        iconWrap: 'bg-red-100',
        iconText: 'text-red-700',
    },
};
