import { IsDate, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTourDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  destinationId: number;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsNotEmpty()
  @IsString()
  duration: string;

  @IsInt()
  @Min(1)
  availableSeats: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
