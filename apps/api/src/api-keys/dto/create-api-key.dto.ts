import { IsString, IsArray, IsOptional, IsDateString, MinLength, ArrayNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
