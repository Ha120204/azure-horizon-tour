import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Thông tin ngân hàng nhận hoàn tiền.
 * Nested object — được validate tự động qua @ValidateNested + @Type.
 */
export class RefundBankDetailsDto {
  @IsString()
  @MinLength(2)
  bankName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  accountNumber: string;

  @IsString()
  @MinLength(2)
  accountHolder: string;
}

/**
 * [CUSTOMER] Gửi yêu cầu hủy booking.
 * POST /booking/:id/cancel-request
 */
export class RequestCancellationDto {
  @IsString()
  @MinLength(10, { message: 'Lý do hủy phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Lý do hủy không được vượt quá 1000 ký tự' })
  reason: string;

  /**
   * Thông tin ngân hàng nhận hoàn tiền — chỉ bắt buộc khi đơn đã thanh toán.
   * Validation bắt buộc/optional được xử lý ở service layer vì phụ thuộc
   * vào paymentStatus của booking.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RefundBankDetailsDto)
  bankDetails?: RefundBankDetailsDto;
}

/**
 * [ADMIN] Duyệt yêu cầu hủy booking.
 * POST /booking/admin/:id/approve-cancel
 */
export class ApproveCancellationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

/**
 * [ADMIN] Từ chối yêu cầu hủy booking.
 * POST /booking/admin/:id/reject-cancel
 */
export class RejectCancellationDto {
  @IsString()
  @MinLength(10, { message: 'Lý do từ chối phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Lý do từ chối không được vượt quá 500 ký tự' })
  rejectReason: string;
}

export class AdminCancelBookingDto {
  @IsString()
  @MinLength(10, { message: 'Lý do hủy phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Lý do hủy không được vượt quá 1000 ký tự' })
  reason: string;
}

export class UpdateBookingNoteDto {
  @IsString()
  @MaxLength(1000, { message: 'Ghi chú không được vượt quá 1000 ký tự' })
  note: string;
}
