import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @IsOptional()
  @ValidateIf((dto: UpdateUserDto) => dto.phone !== '')
  @Matches(/^\d{9,11}$/, { message: 'Số điện thoại phải gồm 9-11 chữ số' })
  phone?: string;

  @IsOptional()
  @ValidateIf((dto: UpdateUserDto) => dto.dob !== '')
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dob?: string;

  @IsOptional()
  @ValidateIf((dto: UpdateUserDto) => dto.gender !== '')
  @IsIn(['Nam', 'Nữ', 'Khác'], { message: 'Giới tính không hợp lệ' })
  gender?: string;
}
