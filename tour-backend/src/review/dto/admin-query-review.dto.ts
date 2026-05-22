import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';


export class AdminQueryReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  /** Tìm kiếm theo tên KH, tên tour, nội dung review */
  @IsOptional()
  @IsString()
  search?: string;

  /** Lọc theo rating: 1 | 2 | 3 | 4 | 5 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rating?: number;

  /** Lọc nhiều rating, ví dụ: 1,2 */
  @IsOptional()
  @IsString()
  ratings?: string;

  /** Lọc theo trạng thái: 'hidden' | 'visible' */
  @IsOptional()
  @IsString()
  status?: string;

  /** Lọc theo phản hồi: 'replied' | 'unreplied' */
  @IsOptional()
  @IsString()
  replyStatus?: string;

  /** Lọc theo tourId cụ thể */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tourId?: number;

  /** Sắp xếp: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' */
  @IsOptional()
  @IsString()
  sortBy?: string;
}

export class AdminReplyDto {
  @IsString()
  content!: string;
}
