import { Role } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UserStatsQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
