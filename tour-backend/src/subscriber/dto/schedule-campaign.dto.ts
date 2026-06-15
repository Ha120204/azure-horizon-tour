import { IsISO8601 } from 'class-validator';

export class ScheduleCampaignDto {
  @IsISO8601({}, { message: 'Thời gian gửi không hợp lệ' })
  scheduledAt: string;
}
