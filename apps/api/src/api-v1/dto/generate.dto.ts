import { IsString, MinLength, IsOptional, IsUUID } from 'class-validator';

export class GenerateDto {
  @IsString()
  @MinLength(3)
  topic!: string;

  @IsOptional()
  @IsString()
  presentationType?: string;

  @IsOptional()
  @IsUUID()
  briefId?: string;

  @IsOptional()
  @IsUUID()
  pitchLensId?: string;

  @IsOptional()
  @IsUUID()
  themeId?: string;
}

export class ExportDto {
  @IsString()
  format!: string; // 'PPTX' | 'PDF' | 'REVEAL_JS'
}

export class ForkDto {
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
