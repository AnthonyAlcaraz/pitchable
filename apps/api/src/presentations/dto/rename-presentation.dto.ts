import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RenamePresentationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
