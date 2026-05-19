import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const SUBJECTS_REQUIRING_REFERENCE = ['payment', 'cancellation', 'complaint'];

export class SendContactDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  phonePrefix: string;

  @ValidateIf((dto: SendContactDto) =>
    SUBJECTS_REQUIRING_REFERENCE.includes(dto.subject),
  )
  @IsNotEmpty({ message: 'Booking reference is required for this request type' })
  @IsString()
  @MaxLength(50)
  reference?: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty({ message: 'Message is required' })
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  userId?: number; // Liên kết ticket với tài khoản user (nếu đã đăng nhập)
}
