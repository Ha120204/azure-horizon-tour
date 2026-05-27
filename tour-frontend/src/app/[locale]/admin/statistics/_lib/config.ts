export const PRESETS = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '3 tháng', days: 90 },
    { label: '6 tháng', days: 180 },
    { label: '12 tháng', days: 365 },
] as const;

export const GRAN_MAP: Record<string, string> = { daily: 'Theo ngày', weekly: 'Theo tuần', monthly: 'Theo tháng' };

export const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];
