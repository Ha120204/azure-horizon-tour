import { IsBoolean } from 'class-validator';

export class SetSubscriberStatusDto {
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive: boolean;
}
