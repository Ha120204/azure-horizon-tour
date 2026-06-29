import {
  IsIn, IsNotEmpty, IsOptional, IsString, MaxLength,
  IsInt, Min, Max, IsBoolean, IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Admin / Staff DTOs ───────────────────────────────────────────────────────

export class UpdateTicketStatusDto {
  @IsIn(['NEW', 'IN_PROGRESS', 'RESOLVED'])
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
}

export class AssignTicketDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  staffId?: number;
}

export class CreateTicketReplyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(3000)
  content: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

// ─── Customer DTOs ────────────────────────────────────────────────────────────

/** Dùng cho query param: ?accessCode=xxx */
export class LookupQueryDto {
  @IsOptional()
  @IsString()
  accessCode?: string;
}

/** Customer phản hồi ticket (chỉ khi IN_PROGRESS) */
export class CustomerReplyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;

  /** Access Code để verify quyền sở hữu (dành cho guest không có JWT) */
  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsOptional()
  @IsString()
  senderName?: string;
}

/** Tra cứu ticket bằng email + accessCode (dành cho khách vãng lai mất link) */
export class LookupByEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  accessCode: string;
}

/** Dịch một đoạn tin nhắn hỗ trợ on-demand (admin: targetLang='vi'; khách: ='en') */
export class TranslateMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(3000)
  content: string;

  @IsIn(['vi', 'en'])
  targetLang: 'vi' | 'en';

  /** Access Code để verify quyền (guest không có JWT) */
  @IsOptional()
  @IsString()
  accessCode?: string;
}

/** Đánh giá sau khi RESOLVED */
export class RateTicketDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  accessCode?: string;
}
