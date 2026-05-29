import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * [STAFF + ADMIN] Ghi nhận thu tiền tại cửa hàng.
 * POST /booking/admin/:id/payments/in-store/confirm
 */
export class ConfirmInStoreDto {
  /** Cách thu tiền tại quầy */
  @IsIn(['CASH', 'BANK_TRANSFER', 'CARD_POS'], {
    message: 'collectionMethod phải là CASH, BANK_TRANSFER, hoặc CARD_POS',
  })
  collectionMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD_POS';

  /** Số tiền thực nhận — nếu bỏ qua sẽ dùng totalPrice của booking */
  @IsOptional()
  @IsNumber({}, { message: 'Số tiền phải là số hợp lệ' })
  @Min(1000, { message: 'Số tiền phải lớn hơn 1.000đ' })
  amount?: number;

  /** Mã biên nhận, mã giao dịch POS, hoặc số tham chiếu */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiptRef?: string;

  /** Ghi chú tùy chọn */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * [ADMIN] Đối soát thủ công khi khách gửi ảnh chuyển khoản.
 * POST /booking/admin/:id/payments/payos/reconcile
 */
export class ReconcilePayosDto {
  /** Mã tham chiếu giao dịch ngân hàng — BẮT BUỘC */
  @IsString()
  @MinLength(4, { message: 'Mã tham chiếu giao dịch phải có ít nhất 4 ký tự' })
  @MaxLength(100)
  transactionRef: string;

  /** Số tiền trong ảnh chuyển khoản */
  @IsNumber({}, { message: 'Số tiền phải là số hợp lệ' })
  @Min(1000, { message: 'Số tiền phải lớn hơn 1.000đ' })
  amount: number;

  /** Ghi chú xác nhận — BẮT BUỘC (audit trail) */
  @IsString()
  @MinLength(5, { message: 'Ghi chú xác nhận phải có ít nhất 5 ký tự' })
  @MaxLength(500)
  note: string;

  /** URL ảnh giao dịch đã upload (Cloudinary) */
  @IsOptional()
  @IsUrl({}, { message: 'evidenceUrl phải là URL hợp lệ' })
  evidenceUrl?: string;
}

/**
 * [CUSTOMER] Báo sự cố khi đã chuyển khoản nhưng hệ thống chưa ghi nhận.
 * POST /booking/:id/payment-issue
 */
export class ReportPaymentIssueDto {
  /** Số tiền khách báo đã chuyển */
  @IsNumber({}, { message: 'Số tiền phải là số hợp lệ' })
  @Min(1000, { message: 'Số tiền phải lớn hơn 1.000đ' })
  amount: number;

  /** Thời điểm khách chuyển khoản (ISO string hoặc datetime-local) */
  @IsString()
  @MinLength(1, { message: 'Thời gian chuyển khoản là bắt buộc' })
  transferredAt: string;

  /** Mã giao dịch / nội dung chuyển khoản */
  @IsString()
  @MinLength(4, { message: 'Mã giao dịch hoặc nội dung chuyển khoản là bắt buộc (ít nhất 4 ký tự)' })
  @MaxLength(200)
  transactionRef: string;

  /** Ngân hàng hoặc tài khoản chuyển */
  @IsString()
  @MinLength(2, { message: 'Ngân hàng chuyển khoản là bắt buộc' })
  @MaxLength(100)
  senderBank: string;

  /** Tên chủ tài khoản chuyển */
  @IsString()
  @MinLength(2, { message: 'Tên chủ tài khoản chuyển là bắt buộc' })
  @MaxLength(100)
  senderAccountName: string;

  /** Mô tả sự cố từ khách — tùy chọn */
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Ghi chú phải có tối thiểu 5 ký tự' })
  @MaxLength(1000)
  message?: string;

  /** URL ảnh giao dịch khách upload — tùy chọn */
  @IsOptional()
  @IsUrl({}, { message: 'evidenceUrl phải là URL hợp lệ' })
  evidenceUrl?: string;
}

/**
 * [CUSTOMER] Thay đổi phương thức thanh toán.
 * PATCH /booking/:id/payment-method
 */
export class UpdatePaymentMethodDto {
  @IsIn(['PAYOS', 'IN_STORE'], {
    message: 'Phương thức thanh toán phải là PAYOS hoặc IN_STORE',
  })
  paymentMethod: 'PAYOS' | 'IN_STORE';
}

/**
 * [STAFF + ADMIN] Gửi lại yêu cầu thanh toán.
 * POST /booking/admin/:id/resend-payment-request
 */
export class ResendPaymentRequestDto {
  @IsOptional()
  @IsBoolean()
  forceEmail?: boolean;
}
