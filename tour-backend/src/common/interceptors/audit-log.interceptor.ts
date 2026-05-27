import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';

type AuditUser = {
    userId?: number;
    id?: number;
};

type AuditRequest = Request & {
    user?: AuditUser;
};

type UnknownRecord = Record<string, unknown>;

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_AUDIT_KEYS = new Set([
    'accesscode',
    'accesstoken',
    'accountnumber',
    'authorization',
    'bankaccount',
    'bankaccountname',
    'bankaccountnumber',
    'cancelreason',
    'cookie',
    'currentpassword',
    'customeremail',
    'customername',
    'customerphone',
    'email',
    'emailforticket',
    'evidenceurl',
    'fullname',
    'identityno',
    'message',
    'newpassword',
    'note',
    'password',
    'phone',
    'receiptref',
    'reason',
    'refundbankdetails',
    'rejectreason',
    'refreshtoken',
    'senderaccountname',
    'senderbank',
    'token',
    'transactionref',
]);

function asRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as UnknownRecord)
        : null;
}

function readStringField(record: UnknownRecord, key: string) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return undefined;
}

function firstStringField(record: UnknownRecord, keys: string[]) {
    for (const key of keys) {
        const value = readStringField(record, key);
        if (value) return value;
    }
    return undefined;
}

function readRouteParamId(request: AuditRequest) {
    const id = request.params?.id;
    return Array.isArray(id) ? id[0] : id;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown audit log error';
}

function sanitizeAuditData(value: unknown, depth = 0): unknown {
    if (value == null || typeof value !== 'object') {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (depth > 6) {
        return REDACTED_VALUE;
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeAuditData(item, depth + 1));
    }

    return Object.fromEntries(
        Object.entries(value as UnknownRecord).map(([key, entry]) => [
            key,
            SENSITIVE_AUDIT_KEYS.has(key.toLowerCase())
                ? REDACTED_VALUE
                : sanitizeAuditData(entry, depth + 1),
        ]),
    );
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector,
        private logService: ActivityLogService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const metadata = this.reflector.get<AuditLogMetadata>(
            AUDIT_LOG_KEY,
            context.getHandler(),
        );

        if (!metadata) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<AuditRequest>();

        return next.handle().pipe(
            tap((response: unknown) => {
                void this.createAuditLog(request, metadata, response);
            }),
        );
    }

    private async createAuditLog(
        request: AuditRequest,
        metadata: AuditLogMetadata,
        response: unknown,
    ) {
        try {
            const responseRecord = asRecord(response);
            const data = responseRecord && 'data' in responseRecord
                ? responseRecord.data
                : response;
            const dataRecord = asRecord(data);

            const resourceId = dataRecord
                ? firstStringField(dataRecord, ['id', 'tourCode', 'bookingCode'])
                    ?? readRouteParamId(request)
                : readRouteParamId(request);

            const targetName = dataRecord
                ? firstStringField(dataRecord, [
                    'name',
                    'title',
                    'label',
                    'code',
                    'bookingCode',
                    'slug',
                ])
                : undefined;

            const newData =
                metadata.action === 'UPDATE'
                    ? sanitizeAuditData(request.body)
                    : metadata.action === 'CREATE'
                        ? sanitizeAuditData(data)
                        : undefined;

            await this.logService.create({
                action: metadata.action,
                resource: metadata.resource,
                resourceId,
                targetName: targetName || `Resource ID: ${resourceId || 'Unknown'}`,
                description: `[${metadata.action}] on ${metadata.resource} ${targetName ? `(${targetName})` : ''}`,
                userId: request.user?.userId ?? request.user?.id,
                ipAddress: request.ip || request.socket.remoteAddress,
                userAgent: request.headers['user-agent'],
                newData,
                oldData: undefined,
            });
        } catch (error) {
            console.error('AuditLogInterceptor Error:', getErrorMessage(error));
        }
    }
}
