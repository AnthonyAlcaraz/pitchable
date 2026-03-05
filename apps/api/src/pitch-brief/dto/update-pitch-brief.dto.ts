import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePitchBriefDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
