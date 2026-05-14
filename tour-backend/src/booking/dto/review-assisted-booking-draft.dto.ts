import { IsOptional, IsString } from 'class-validator';

export class ReviewAssistedBookingDraftDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
