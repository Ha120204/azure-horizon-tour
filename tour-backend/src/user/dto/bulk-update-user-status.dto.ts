import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsInt } from 'class-validator';

export class BulkUpdateUserStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  ids: number[];

  @IsIn(['active', 'deactivated'])
  status: 'active' | 'deactivated';
}
