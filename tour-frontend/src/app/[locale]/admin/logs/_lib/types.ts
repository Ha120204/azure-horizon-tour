export interface UserInfo {
    id: number;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
}

export interface ActivityLog {
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

export interface LogStats {
    total: number;
    todayCount: number;
    create: number;
    update: number;
    delete: number;
    login: number;
}

export type KpiFilter = 'all' | 'today' | 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditRecord = Record<string, unknown>;

export interface AuditFieldRow {
    key: string;
    label: string;
    before?: string;
    after?: string;
}

export interface AuditRowsResult {
    visibleRows: AuditFieldRow[];
    hiddenEmptyCount: number;
    totalRows: number;
}

export interface AuditSeverity {
    label: string;
    className: string;
    icon: string;
}
