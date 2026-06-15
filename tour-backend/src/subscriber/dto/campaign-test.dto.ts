import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CAMPAIGN_BODY_MAX,
  CAMPAIGN_NAME_MAX,
  CAMPAIGN_PREVIEW_MAX,
  CAMPAIGN_SUBJECT_MAX,
} from './marketing.constants';

export class CampaignTestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email gửi thử không hợp lệ' })
  to: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề email là bắt buộc' })
  @MaxLength(CAMPAIGN_SUBJECT_MAX)
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung email là bắt buộc' })
  @MaxLength(CAMPAIGN_BODY_MAX)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(CAMPAIGN_PREVIEW_MAX)
  previewText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CAMPAIGN_NAME_MAX)
  campaignName?: string;
}
