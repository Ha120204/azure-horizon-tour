import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * ===========================================================
 * ALL EXCEPTIONS FILTER (catch-all)
 * ===========================================================
 * Chuẩn hóa MỌI response lỗi về cùng một cấu trúc, đồng bộ với
 * format thành công của TransformInterceptor:
 *   { statusCode, message, error, timestamp }
 *
 * Gộp 3 nhánh vào một filter duy nhất để tránh phụ thuộc thứ tự
 * đăng ký filter:
 *   1. Prisma known request error  → map sang HTTP thân thiện, giấu chi tiết DB
 *   2. HttpException               → giữ nguyên status + message (kể cả mảng validation)
 *   3. Lỗi không xác định          → 500 generic, KHÔNG lộ stack/message nội bộ
 * ===========================================================
 */

type ErrorShape = {
  statusCode: number;
  message: string | string[];
  error: string;
  // Các field bổ sung mà exception cố ý đính kèm (vd: errorCode, availableSeats
  // của SeatsUnavailableException) — giữ nguyên để client phản ứng chính xác.
  extra?: Record<string, unknown>;
};

const ERROR_NAME_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error, extra } = this.resolve(exception, request);

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      ...extra,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown, request: Request): ErrorShape {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    // Lỗi không xác định — log chi tiết phía server, trả thông điệp chung cho client
    this.logger.error(
      `Unhandled exception on ${request?.method} ${request?.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
      error: 'Internal Server Error',
    };
  }

  private fromHttpException(exception: HttpException): ErrorShape {
    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    const fallbackName = ERROR_NAME_BY_STATUS[statusCode] ?? 'Error';

    if (typeof res === 'string') {
      return { statusCode, message: res, error: fallbackName };
    }

    if (isRecord(res)) {
      const rawMessage = res.message;
      let message: string | string[];
      if (typeof rawMessage === 'string') {
        message = rawMessage;
      } else if (
        Array.isArray(rawMessage) &&
        rawMessage.every((item) => typeof item === 'string')
      ) {
        message = rawMessage;
      } else {
        message = exception.message;
      }
      const error =
        typeof res.error === 'string' ? res.error : fallbackName;
      const { message: _m, error: _e, statusCode: _s, ...rest } = res;
      const extra = Object.keys(rest).length ? rest : undefined;
      return { statusCode, message, error, extra };
    }

    return { statusCode, message: exception.message, error: fallbackName };
  }

  private fromPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorShape {
    switch (exception.code) {
      // P2002: Unique constraint — VD đăng ký email đã tồn tại, tạo mã trùng
      case 'P2002': {
        const fields =
          (exception.meta?.target as string[] | undefined)?.join(', ') || 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Giá trị '${fields}' đã tồn tại trong hệ thống.`,
          error: 'Conflict',
        };
      }
      // P2025: Update/Delete một record không tồn tại
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy dữ liệu yêu cầu.',
          error: 'Not Found',
        };
      // P2003: Foreign key — xóa bản ghi đang được liên kết
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'Không thể thực hiện vì dữ liệu đang được liên kết với bản ghi khác.',
          error: 'Bad Request',
        };
      // P2014: Required relation violation
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Thiếu dữ liệu liên kết bắt buộc.',
          error: 'Bad Request',
        };
      default:
        // Không lộ cấu trúc DB/SQL ra ngoài — chỉ log code phía server
        this.logger.error(`Prisma Error [${exception.code}]`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
          error: 'Internal Server Error',
        };
    }
  }
}
