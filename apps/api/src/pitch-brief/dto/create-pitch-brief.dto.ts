import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePitchBriefDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
