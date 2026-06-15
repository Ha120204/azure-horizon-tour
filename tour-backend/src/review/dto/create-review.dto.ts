import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, IsArray, MaxLength, MinLength } from 'class-validator';

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
  @MinLength(20)
  @MaxLength(1000)
  content: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imageUrls?: string[];
}

