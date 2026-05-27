import type { Setting } from './types';

export const canEdit = (role: string) => role === 'SUPER_ADMIN';

export const buildDraft = (settings: Setting[]): Record<string, string> =>
    Object.fromEntries(settings.map(s => [s.key, s.value]));

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
