import { IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatRequestDto {
  @IsNotEmpty({ message: 'Message is required' })
  @IsString()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  // ID tour của trang khách đang mở, để AI biết "tour này" là tour nào.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  currentTourId?: number;

  // Ngôn ngữ giao diện hiện tại — dùng làm fallback khi không xác định được
  // ngôn ngữ tin nhắn của khách (AI ưu tiên "soi gương" theo ngôn ngữ khách gõ).
  @IsOptional()
  @IsIn(['vi', 'en'])
  language?: string;

  // Đơn vị tiền khách đang dùng — để AI nhận/gợi ý ngân sách theo đúng tiền tệ.
  @IsOptional()
  @IsIn(['VND', 'USD'])
  currency?: string;
}
