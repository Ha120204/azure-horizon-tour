import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector,
        private logService: ActivityLogService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const metadata = this.reflector.get<AuditLogMetadata>(
            AUDIT_LOG_KEY,
            context.getHandler(),
        );

        if (!metadata) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const ip = request.ip || request.connection?.remoteAddress;
        const userAgent = request.headers['user-agent'];

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    // Cố gắng trích xuất tên/thông tin từ response hoặc body để log
                    let targetName: string | undefined = undefined;
                    let resourceId: string | undefined = undefined;

                    // Nếu endpoint trả về 1 object (thường là cái vừa bị tác động)
                    // Unwrap TransformInterceptor nếu có
                    const data = response?.data ?? response;
                    
                    if (data && typeof data === 'object' && !Array.isArray(data)) {
                        // resourceId: ưu tiên id, rồi code, rồi params
                        resourceId = data.id?.toString()
                            || data.tourCode?.toString()
                            || data.bookingCode?.toString()
                            || request.params?.id?.toString();

                        // targetName: lấy field tên đại diện tốt nhất
                        targetName = data.name
                            || data.title
                            || data.label
                            || data.code
                            || data.fullName
                            || data.bookingCode
                            || data.email
                            || data.slug
                            || undefined;
                    } else {
                        resourceId = request.params?.id?.toString();
                    }

                    // Nếu hành động là DELETE, lấy tên từ oldData (nếu controller trả về)
                    const oldData: any = undefined;
                    let newData: any = undefined;

                    if (metadata.action === 'UPDATE') {
                        newData = request.body;
                    } else if (metadata.action === 'CREATE') {
                        newData = data;
                    }

                    await this.logService.create({
                        action: metadata.action,
                        resource: metadata.resource,
                        resourceId: resourceId,
                        targetName: targetName || `Resource ID: ${resourceId || 'Unknown'}`,
                        description: `[${metadata.action}] on ${metadata.resource} ${targetName ? `(${targetName})` : ''}`,
                        userId: user?.userId ?? user?.id,
                        ipAddress: ip,
                        userAgent: userAgent,
                        newData: newData,
                        oldData: oldData,
                    });
                } catch (error) {
                    console.error('AuditLogInterceptor Error:', error);
                }
            }),
        );
    }
}
