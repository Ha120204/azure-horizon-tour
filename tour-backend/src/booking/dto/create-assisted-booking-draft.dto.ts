import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { type PassengerDto } from './create-booking.dto';

export class CreateAssistedBookingDraftDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerIdentityNo?: string;

  @IsOptional()
  @IsString()
  sourceChannel?: string;

  @IsOptional()
  @IsString()
  confirmationChannel?: string;

  // Không có mặc định — staff phải hỏi khách chọn PAYOS hay trả tại quầy
  // trước khi gửi duyệt (xem assertAssistedDraftReadyForApproval).
  @IsOptional()
  @IsIn(['PAYOS', 'IN_STORE'])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  emailForTicket?: string;

  @IsOptional()
  @IsInt()
  sourceTicketId?: number;

  @IsOptional()
  @IsInt()
  tourId?: number;

  @IsOptional()
  @IsInt()
  packageId?: number;

  @IsOptional()
  @IsInt()
  departureId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfPeople?: number;

  @IsOptional()
  @IsArray()
  passengers?: PassengerDto[];

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  internalNote?: string;
}
