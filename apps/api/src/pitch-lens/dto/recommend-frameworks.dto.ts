import { IsEnum } from 'class-validator';
import {
  AudienceType,
  PitchGoal,
  CompanyStage,
  TechnicalLevel,
} from '../../../generated/prisma/enums.js';

export class RecommendFrameworksDto {
  @IsEnum(AudienceType)
  audienceType: AudienceType;

  @IsEnum(PitchGoal)
  pitchGoal: PitchGoal;

  @IsEnum(CompanyStage)
  companyStage: CompanyStage;

  @IsEnum(TechnicalLevel)
  technicalLevel: TechnicalLevel;
}
