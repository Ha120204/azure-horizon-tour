import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsObject,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Thông tin ngân hàng nhận hoàn tiền.
 * Nested object — được validate tự động qua @ValidateNested + @Type.
 */
export class RefundBankDetailsDto {
  @IsString({ message: 'Vui lòng chọn ngân hàng nhận tiền hoàn' })
  @MinLength(2, { message: 'Vui lòng chọn ngân hàng nhận tiền hoàn' })
  bankName: string;

  @IsString({ message: 'Vui lòng nhập số tài khoản nhận hoàn' })
  @MinLength(6, { message: 'Số tài khoản phải có ít nhất 6 chữ số' })
  @MaxLength(30, { message: 'Số tài khoản không được vượt quá 30 chữ số' })
  accountNumber: string;

  @IsString({ message: 'Vui lòng nhập tên chủ tài khoản' })
  @MinLength(2, { message: 'Tên chủ tài khoản phải có ít nhất 2 ký tự' })
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

/**
 * [ADMIN] Xác nhận đã chuyển khoản hoàn tiền cho khách (thủ công).
 * POST /booking/admin/:id/confirm-refund
 */
export class ConfirmRefundDto {
  /** Ghi chú đối soát hoàn tiền (mã giao dịch CK, người thực hiện…) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** URL ảnh biên lai chuyển khoản hoàn tiền (Cloudinary) */
  @IsOptional()
  @IsUrl({}, { message: 'evidenceUrl phải là URL hợp lệ' })
  evidenceUrl?: string;
}

export class UpdateBookingNoteDto {
  @IsString()
  @MaxLength(1000, { message: 'Ghi chú không được vượt quá 1000 ký tự' })
  note: string;
}
