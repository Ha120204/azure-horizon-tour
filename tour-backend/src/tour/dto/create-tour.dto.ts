import { IsDate, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';

export class CreateTourDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationId: number;

  @Type(() => Date)
  @IsDate()
  @IsFutureDate({ message: 'Ngày khởi hành phải là ngày hôm nay hoặc trong tương lai.' })
  startDate: Date;

  @IsNotEmpty()
  @IsString()
  duration: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  availableSeats: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  tourType?: string;
}
