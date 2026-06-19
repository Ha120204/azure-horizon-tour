import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AudienceFilterDto } from './audience-filter.dto';
import {
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_BODY_MAX,
  CAMPAIGN_NAME_MAX,
  CAMPAIGN_PREVIEW_MAX,
  CAMPAIGN_SUBJECT_MAX,
  CAMPAIGN_TYPES,
  type CampaignAudience,
  type CampaignType,
} from './marketing.constants';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên chiến dịch là bắt buộc' })
  @MaxLength(CAMPAIGN_NAME_MAX)
  campaignName: string;

  @IsOptional()
  @IsIn(CAMPAIGN_TYPES)
  type?: CampaignType;

  // Bản nháp được phép để trống tiêu đề/nội dung; ràng buộc bắt buộc chỉ áp dụng
  // khi lên lịch gửi (xem subscriber.service.scheduleCampaign).
  @IsOptional()
  @IsString()
  @MaxLength(CAMPAIGN_SUBJECT_MAX)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CAMPAIGN_PREVIEW_MAX)
  previewText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CAMPAIGN_BODY_MAX)
  body?: string;

  @IsIn(CAMPAIGN_AUDIENCES, { message: 'Đối tượng nhận không hợp lệ' })
  audience: CampaignAudience;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audienceFilter?: AudienceFilterDto;

  // Chỉ dùng khi audience = MANUAL_SELECTION
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  recipientIds?: number[];
}
