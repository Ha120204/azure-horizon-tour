import {
  IsIn, IsNotEmpty, IsOptional, IsString, MaxLength,
  IsEmail, IsInt, Min, Max, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Admin / Staff DTOs ───────────────────────────────────────────────────────

export class UpdateTicketStatusDto {
  @IsIn(['NEW', 'IN_PROGRESS', 'RESOLVED'])
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
}

export class AssignTicketDto {
  @IsOptional()
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
}

// ─── Customer DTOs ────────────────────────────────────────────────────────────

/** Dùng cho query param: ?email=xxx */
export class LookupQueryDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

/** Customer phản hồi ticket (chỉ khi IN_PROGRESS) */
export class CustomerReplyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;

  /** Email để verify quyền sở hữu (dành cho guest không có JWT) */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  senderName?: string;
}

/** Đánh giá sau khi RESOLVED */
export class RateTicketDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsEmail()
  email?: string;
}
