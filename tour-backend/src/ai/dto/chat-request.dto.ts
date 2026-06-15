import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
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
}
