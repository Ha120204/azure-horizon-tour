import type { Setting, SettingMeta } from './types';

export const canEdit = (role: string) => role === 'SUPER_ADMIN';

export const buildDraft = (settings: Setting[]): Record<string, string> =>
    Object.fromEntries(settings.map(s => [s.key, s.value]));

export const validateSettingDraftValue = (
    setting: Setting,
    draft: Record<string, string>,
    meta: SettingMeta,
) => {
    const value = String(draft[setting.key] ?? '').trim();

    if (meta.required && value.length === 0) return `${setting.label} không được để trống.`;
    if (meta.maxLength && value.length > meta.maxLength) return `${setting.label} không được vượt quá ${meta.maxLength} ký tự.`;

    if (meta.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Vui lòng nhập email hợp lệ.';
    }

    if (meta.type === 'tel' && value && !/^\+?[0-9\s().-]{8,32}$/.test(value)) {
        return 'Vui lòng nhập số điện thoại hợp lệ.';
    }

    if (meta.type === 'number' && value) {
        const numberValue = Number(value);
        if (!Number.isInteger(numberValue)) return `${setting.label} phải là số nguyên.`;
        if (meta.min !== undefined && numberValue < meta.min) return `Giá trị tối thiểu là ${meta.min}.`;
        if (meta.max !== undefined && numberValue > meta.max) return `Giá trị tối đa là ${meta.max}.`;
    }

    if (setting.key === 'booking_min_people' && Number(value) > Number(draft.booking_max_people)) {
        return 'Số khách tối thiểu không được lớn hơn số khách tối đa.';
    }
    if (setting.key === 'booking_max_people' && Number(value) < Number(draft.booking_min_people)) {
        return 'Số khách tối đa không được nhỏ hơn số khách tối thiểu.';
    }
    if (setting.key === 'announcement_text' && draft.announcement_enabled === 'true' && !value) {
        return 'Nhập nội dung thông báo trước khi bật banner.';
    }

    return '';
};

export const formatSettingDate = (value?: string) => {
    if (!value) return 'Chưa ghi nhận';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleString('vi-VN');
};

export const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'Chưa rõ';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return `${seconds}s`;
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`;
};
