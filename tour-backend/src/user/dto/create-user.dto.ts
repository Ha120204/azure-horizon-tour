import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches, IsBoolean } from 'class-validator';

enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'
  })
  password: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsString()
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Role, { message: 'Role phải là SUPER_ADMIN, ADMIN, STAFF, hoặc CUSTOMER' })
  role: string;
}
