import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CAMPAIGN_SEARCH_MAX,
  SUBSCRIBER_STATUSES,
  type SubscriberStatusFilter,
} from './marketing.constants';

// Bộ lọc đối tượng nhận khi audience = CURRENT_FILTER
export class AudienceFilterDto {
  @IsOptional()
  @IsIn(SUBSCRIBER_STATUSES)
  status?: SubscriberStatusFilter;

  @IsOptional()
  @IsString()
  @MaxLength(CAMPAIGN_SEARCH_MAX)
  search?: string;
}
