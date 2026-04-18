import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * ===========================================================
 * PRISMA CLIENT EXCEPTION FILTER
 * ===========================================================
 * Bắt gọn mọi lỗi raw từ Prisma ORM và chuyển thành
 * HTTP response thân thiện. Không bao giờ lộ cấu trúc DB
 * hay SQL error ra ngoài cho client/hacker thấy.
 *
 * Kỹ thuật Senior: Xử lý tập trung lỗi DB thay vì
 * try-catch rải rác khắp codebase.
 * ===========================================================
 */

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';

    switch (exception.code) {
      // P2002: Unique Constraint Violation
      // VD: Đăng ký email đã tồn tại, tạo tour trùng mã
      case 'P2002': {
        statusCode = HttpStatus.CONFLICT; // 409
        const fields = (exception.meta?.target as string[])?.join(', ') || 'field';
        message = `Giá trị '${fields}' đã tồn tại trong hệ thống.`;
        break;
      }

      // P2025: Record Not Found
      // VD: Update/Delete một record không tồn tại
      case 'P2025': {
        statusCode = HttpStatus.NOT_FOUND; // 404
        message = 'Không tìm thấy dữ liệu yêu cầu.';
        break;
      }

      // P2003: Foreign Key Constraint Failed
      // VD: Xóa destination đang có tour liên kết
      case 'P2003': {
        statusCode = HttpStatus.BAD_REQUEST; // 400
        message = 'Không thể thực hiện vì dữ liệu đang được liên kết với bản ghi khác.';
        break;
      }

      // P2014: Required Relation Violation
      case 'P2014': {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Thiếu dữ liệu liên kết bắt buộc.';
        break;
      }

      default: {
        // Log lỗi chi tiết phía server để debug, không hiện cho client
        this.logger.error(
          `Prisma Error [${exception.code}]: ${exception.message}`,
          exception.stack,
        );
        break;
      }
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: this.getErrorName(statusCode),
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorName(statusCode: number): string {
    const errorMap: Record<number, string> = {
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };
    return errorMap[statusCode] || 'Error';
  }
}
