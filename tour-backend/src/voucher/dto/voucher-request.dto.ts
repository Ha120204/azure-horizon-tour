import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SaveVoucherDto {
  @IsInt()
  @Min(1)
  voucherId!: number;
}

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsNumber()
  @Min(0)
  totalPrice!: number;

  @IsOptional()
  @IsInt()
  tourId?: number | null;

  @IsOptional()
  @IsInt()
  departureId?: number | null;
}

export class BulkVoucherActiveDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids!: number[];

  @IsBoolean()
  isActive!: boolean;
}
