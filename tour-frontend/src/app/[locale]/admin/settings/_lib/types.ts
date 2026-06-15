export interface Setting {
    id: number;
    key: string;
    value: string;
    label: string;
    description?: string;
    group: string;
    updatedAt: string;
    updatedBy?: number | null;
    updatedByName?: string | null;
}

export type GroupedSettings = Record<string, Setting[]>;
export type SettingInputType = 'text' | 'email' | 'tel' | 'number' | 'boolean';
export type SettingsPanel = 'company' | 'booking' | 'announcement' | 'runtime' | 'security' | 'payment' | 'email';

export interface SettingMeta {
    type: SettingInputType;
    min?: number;
    max?: number;
    maxLength?: number;
    required?: boolean;
    impact: string;
    risky?: boolean;
}

export interface SecurityInfo {
    jwtExpires: string;
    jwtRefreshExpires: string;
    rateLimit: string;
}

export type SystemHealthStatus = 'ok' | 'warning' | 'error';

export interface SystemHealthItem {
    key: string;
    label: string;
    status: SystemHealthStatus;
    message: string;
    latencyMs?: number;
}

export interface SystemHealth {
    checkedAt: string;
    uptimeSeconds?: number;
    items: SystemHealthItem[];
}
