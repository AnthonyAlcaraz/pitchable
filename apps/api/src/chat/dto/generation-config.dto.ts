import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class GenerationConfigDto {
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(30)
  minSlides?: number;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(30)
  maxSlides?: number;

  @IsOptional()
  @IsString()
  presentationType?: string;

  @IsOptional()
  @IsString()
  themeId?: string;
}

export const DEFAULT_SLIDE_RANGES: Record<string, { min: number; max: number }> = {
  STANDARD: { min: 8, max: 16 },
  VC_PITCH: { min: 10, max: 14 },
  TECHNICAL: { min: 12, max: 18 },
  EXECUTIVE: { min: 8, max: 12 },
};
