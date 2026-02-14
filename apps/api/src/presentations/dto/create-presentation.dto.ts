import { IsString, IsEnum, IsOptional, IsInt, IsIn } from 'class-validator';

export enum PresentationType {
  STANDARD = 'STANDARD',
  VC_PITCH = 'VC_PITCH',
  TECHNICAL = 'TECHNICAL',
  EXECUTIVE = 'EXECUTIVE',
}

export class CreatePresentationDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PresentationType)
  presentationType?: PresentationType;

  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 3, 6, 12])
  imageCount?: number;

  @IsOptional()
  @IsString({ each: true })
  exportFormats?: string[];
}
