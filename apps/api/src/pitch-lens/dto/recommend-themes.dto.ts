import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  AudienceType,
  PitchGoal,
} from '../../../generated/prisma/enums.js';

export class RecommendThemesDto {
  @IsEnum(AudienceType)
  audienceType: AudienceType;

  @IsEnum(PitchGoal)
  pitchGoal: PitchGoal;

  @IsOptional()
  @IsString()
  selectedFramework?: string;
}
