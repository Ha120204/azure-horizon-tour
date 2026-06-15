import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class StatisticsDateRangeDto {
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom phải là ngày hợp lệ (YYYY-MM-DD)' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo phải là ngày hợp lệ (YYYY-MM-DD)' })
  dateTo?: string;
}

export class StatisticsRevenueQueryDto extends StatisticsDateRangeDto {
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'], { message: 'granularity phải là daily, weekly hoặc monthly' })
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export class StatisticsTopQueryDto extends StatisticsDateRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(20, { message: 'limit tối đa là 20' })
  limit?: number;
}
