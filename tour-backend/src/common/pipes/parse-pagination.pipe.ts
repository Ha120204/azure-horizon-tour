import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PAGINATION } from '../constants';

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pipe chuẩn hóa query params phân trang.
 * Dùng: @Query(new ParsePaginationPipe()) { page, limit }: PaginationParams
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: Record<string, unknown>): PaginationParams {
    const rawPage = Number(value?.page ?? PAGINATION.DEFAULT_PAGE);
    const rawLimit = Number(value?.limit ?? PAGINATION.DEFAULT_LIMIT);

    if (!Number.isInteger(rawPage) || rawPage < 1) {
      throw new BadRequestException('page phải là số nguyên dương');
    }

    if (!Number.isInteger(rawLimit) || rawLimit < 1) {
      throw new BadRequestException('limit phải là số nguyên dương');
    }

    return {
      page: rawPage,
      limit: Math.min(rawLimit, PAGINATION.MAX_LIMIT),
    };
  }
}
