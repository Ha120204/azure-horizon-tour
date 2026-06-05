import { Role } from '@prisma/client';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsEnum, IsIn, IsInt, IsOptional } from 'class-validator';

export class BulkUpdateUserStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  ids: number[];

  @IsIn(['active', 'deactivated'])
  status: 'active' | 'deactivated';

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
