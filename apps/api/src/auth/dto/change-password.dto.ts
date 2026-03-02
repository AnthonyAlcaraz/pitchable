import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from './password.constants.js';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
