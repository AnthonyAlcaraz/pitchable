import { IsString, MinLength, IsOptional, IsUUID, IsEmail, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SlideSpecDto {
  @IsString()
  type!: string; // SlideType string value

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  contentHints?: string;

  @IsOptional()
  @IsString()
  sectionLabel?: string;
}

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlideSpecDto)
  slides?: SlideSpecDto[];
}

export class ExportDto {
  @IsString()
  format!: string; // 'PPTX' | 'PDF' | 'REVEAL_JS'
}

export class EmailDto {
  @IsOptional()
  @IsString()
  format?: string; // 'PDF' | 'PPTX'

  @IsOptional()
  @IsEmail()
  email?: string;
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
