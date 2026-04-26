import { IsEnum, IsNotEmpty } from 'class-validator';

enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(Role, { message: 'Role must be one of: SUPER_ADMIN, ADMIN, STAFF, CUSTOMER' })
  role: Role;
}
