import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log_metadata';

export interface AuditLogMetadata {
    action: string;
    resource: string;
}

export const AuditLog = (action: string, resource: string) => 
    SetMetadata(AUDIT_LOG_KEY, { action, resource } as AuditLogMetadata);
