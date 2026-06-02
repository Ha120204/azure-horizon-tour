import { IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';
import { TourStatus } from '@prisma/client';

export class CreateTourDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsFutureDate({ message: 'Ngày khởi hành phải là hôm nay hoặc trong tương lai.' })
  startDate?: Date;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  durationEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  availableSeats?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  tourType?: string;

  @IsOptional()
  @IsString()
  departurePoint?: string;

  @IsOptional()
  @IsString()
  departurePointEn?: string;

  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;
}
