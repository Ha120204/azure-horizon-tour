import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imageUrls?: string[];
}

