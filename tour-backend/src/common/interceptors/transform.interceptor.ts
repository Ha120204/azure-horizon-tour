import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * ===========================================================
 * GLOBAL RESPONSE TRANSFORM INTERCEPTOR
 * ===========================================================
 * Chuẩn hóa MỌI response thành công thành format thống nhất:
 * {
 *   statusCode: 200,
 *   message: "Success",
 *   data: { ... },
 *   timestamp: "2026-04-17T..."
 * }
 *
 * Kỹ thuật Senior: Đảm bảo Frontend luôn nhận response
 * cùng một cấu trúc, dễ handle và debug.
 * ===========================================================
 */

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

type HttpRequestHeaders = {
  headers?: Record<string, string | string[] | undefined>;
};

type HttpResponseStatus = {
  statusCode: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class TransformInterceptor
  implements NestInterceptor<unknown, unknown>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequestHeaders>();
    const response = context.switchToHttp().getResponse<HttpResponseStatus>();
    const acceptHeader = request.headers?.accept;
    const acceptsEventStream = Array.isArray(acceptHeader)
      ? acceptHeader.some((value) => value.includes('text/event-stream'))
      : acceptHeader?.includes('text/event-stream');

    if (acceptsEventStream) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const payload = isRecord(data) ? data : {};
        // Nếu response đã có cấu trúc { message, data } → giữ nguyên message
        const message = typeof payload.message === 'string' && payload.message
          ? payload.message
          : 'Success';
        const responseData = Object.prototype.hasOwnProperty.call(payload, 'data')
          ? payload.data
          : data;

        // Nếu response có meta (pagination) → giữ lại
        const meta = payload.meta;
        const stats = payload.stats;

        return {
          statusCode: response.statusCode,
          message,
          data: responseData,
          ...(meta !== undefined && { meta }),
          ...(stats !== undefined && { stats }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
