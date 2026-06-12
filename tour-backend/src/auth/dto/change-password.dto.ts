import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import {
  PASSWORD_POLICY_REGEX,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_POLICY_MESSAGE,
} from '../constants';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}
