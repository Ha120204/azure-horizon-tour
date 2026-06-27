import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

// Số không âm, cho phép thập phân (dùng cho giá, rating)
const NON_NEGATIVE_NUMBER = /^\d+(\.\d+)?$/;
// Số nguyên dương (page/limit) — loại 0, số âm và số thập phân
const POSITIVE_INTEGER = /^[1-9]\d*$/;

export class FilterTourDto {
  @IsOptional()
  @IsString()
  dest?: string;

  @IsOptional()
  @IsString()
  travelScope?: string;

  @IsOptional()
  @Matches(NON_NEGATIVE_NUMBER, { message: 'minPrice phải là số không âm' })
  minPrice?: string;

  @IsOptional()
  @ValidateIf((o: FilterTourDto) => o.maxPrice !== 'unlimited')
  @Matches(NON_NEGATIVE_NUMBER, {
    message: 'maxPrice phải là số không âm hoặc "unlimited"',
  })
  maxPrice?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  ratings?: string;

  @IsOptional()
  @Matches(NON_NEGATIVE_NUMBER, { message: 'minRating không hợp lệ' })
  minRating?: string; // threshold: lọc tour có averageRating >= giá trị này (vd: 4.5, 4.0, 3.0)

  @IsOptional()
  @IsString()
  types?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: 'page phải là số nguyên dương' })
  page?: string;

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: 'limit phải là số nguyên dương' })
  limit?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @Matches(POSITIVE_INTEGER, { message: 'destinationId phải là số nguyên dương' })
  destinationId?: string; // Lọc chính xác theo ID điểm đến (dùng ở admin)

  @IsOptional()
  @IsString()
  departure?: string; // Lọc theo điểm khởi hành (contains, case-insensitive)

  @IsOptional()
  @IsString()
  status?: string; // 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'

  @IsOptional()
  @IsString()
  startDateFrom?: string; // ISO date string: lọc tour có startDate >= giá trị này

  @IsOptional()
  @IsString()
  startDateTo?: string; // ISO date string: lọc tour có startDate <= giá trị này

  @IsOptional()
  @IsString()
  featured?: string; // 'true' → chỉ lấy tour nổi bật (dùng cho trang chủ)

  @IsOptional()
  @IsString()
  hasSale?: string; // 'true' → chỉ lấy tour có departure sale đang active
}
