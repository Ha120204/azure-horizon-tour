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

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Nếu response đã có cấu trúc { message, data } → giữ nguyên message
        const message = data?.message || 'Success';
        const responseData = data?.data !== undefined ? data.data : data;

        // Nếu response có meta (pagination) → giữ lại
        const meta = data?.meta;
        const stats = data?.stats;

        return {
          statusCode: response.statusCode,
          message,
          data: responseData,
          ...(meta && { meta }),
          ...(stats && { stats }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
