import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Trần giá trị tiền (VND) để chặn nhập sai thừa số 0
export const MAX_VOUCHER_AMOUNT = 10_000_000_000;

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType!: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  @Min(0)
  @Max(MAX_VOUCHER_AMOUNT)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_VOUCHER_AMOUNT)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_VOUCHER_AMOUNT)
  minOrderValue?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number | null;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  eligibleTourIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  eligibleDestinationIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleCustomerSegments?: string[];
}
