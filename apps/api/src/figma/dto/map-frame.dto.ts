import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { SlideType } from '../../../generated/prisma/enums.js';

export class MapFrameDto {
  @IsEnum(SlideType)
  slideType: SlideType;

  @IsString()
  @MaxLength(50)
  figmaNodeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  figmaNodeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  thumbnailUrl?: string;
}
