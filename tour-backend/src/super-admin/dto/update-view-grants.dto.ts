import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { SUPER_ADMIN_AREAS } from '../../auth/decorators/super-admin-area.decorator';

export class UpdateViewGrantsDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(SUPER_ADMIN_AREAS as unknown as string[], { each: true })
  grants: string[];
}
