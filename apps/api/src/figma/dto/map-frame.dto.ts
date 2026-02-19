import { IsString, IsEnum, MaxLength } from 'class-validator';
import { SlideType } from '../../../generated/prisma/enums.js';

export class MapFrameDto {
  @IsEnum(SlideType)
  slideType: SlideType;

  @IsString()
  @MaxLength(50)
  figmaNodeId: string;
}
