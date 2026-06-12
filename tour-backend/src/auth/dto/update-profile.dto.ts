import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  // Cho phép rỗng (xoá số) hoặc 8-15 chữ số.
  @IsOptional()
  @IsString()
  @Matches(/^$|^\d{8,15}$/, { message: 'Số điện thoại chỉ được gồm 8-15 chữ số' })
  phone?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  identityType?: string;

  @IsOptional()
  @IsString()
  identityNo?: string;
}
