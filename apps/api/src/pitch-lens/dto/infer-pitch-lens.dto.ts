import { IsString, IsOptional, IsUUID } from 'class-validator';

export class InferPitchLensDto {
  @IsOptional()
  @IsUUID()
  briefId?: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  audienceHint?: string;
}
