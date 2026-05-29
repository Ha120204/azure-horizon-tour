import { IsOptional, IsString } from 'class-validator';

export class FilterTourDto {
  @IsOptional()
  @IsString()
  dest?: string;

  @IsOptional()
  @IsString()
  travelScope?: string;

  @IsOptional()
  @IsString()
  minPrice?: string;

  @IsOptional()
  @IsString()
  maxPrice?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  ratings?: string;

  @IsOptional()
  @IsString()
  minRating?: string; // threshold: lọc tour có averageRating >= giá trị này (vd: 4.5, 4.0, 3.0)

  @IsOptional()
  @IsString()
  types?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  status?: string; // 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'
}
