import { IsOptional, IsUUID, IsString } from 'class-validator';

export class ForkPresentationDto {
  @IsOptional()
  @IsUUID()
  briefId?: string;

  @IsOptional()
  @IsUUID()
  pitchLensId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
