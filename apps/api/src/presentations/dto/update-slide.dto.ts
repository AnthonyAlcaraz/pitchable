import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SlideType } from '../../../generated/prisma/enums.js';

export class UpdateSlideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  speakerNotes?: string;

  @IsOptional()
  @IsEnum(SlideType)
  slideType?: SlideType;
}
