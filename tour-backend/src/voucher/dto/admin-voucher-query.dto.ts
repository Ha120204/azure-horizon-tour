import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminVoucherQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsOptional()
  @IsIn([
    'active',
    'expired',
    'depleted',
    'inactive',
    'scheduled',
    'expiringSoon',
    'expiredThisMonth',
    'redeemed',
  ])
  status?:
    | 'active'
    | 'expired'
    | 'depleted'
    | 'inactive'
    | 'scheduled'
    | 'expiringSoon'
    | 'expiredThisMonth'
    | 'redeemed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['createdAt', 'startsAt', 'expiresAt', 'usedCount', 'discountValue', 'minOrderValue'])
  sortBy?: 'createdAt' | 'startsAt' | 'expiresAt' | 'usedCount' | 'discountValue' | 'minOrderValue';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export interface VoucherValidationContext {
  userId?: number | null;
  tourId?: number | null;
  departureId?: number | null;
}
