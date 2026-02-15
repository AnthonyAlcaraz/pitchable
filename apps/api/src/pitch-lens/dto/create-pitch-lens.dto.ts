import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import {
  AudienceType,
  PitchGoal,
  ToneStyle,
  CompanyStage,
  TechnicalLevel,
  StoryFramework,
} from '../../../generated/prisma/enums.js';

export class CreatePitchLensDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(AudienceType)
  audienceType: AudienceType;

  @IsEnum(PitchGoal)
  pitchGoal: PitchGoal;

  @IsString()
  @MaxLength(100)
  industry: string;

  @IsEnum(CompanyStage)
  companyStage: CompanyStage;

  @IsEnum(ToneStyle)
  toneStyle: ToneStyle;

  @IsEnum(TechnicalLevel)
  technicalLevel: TechnicalLevel;

  @IsEnum(StoryFramework)
  selectedFramework: StoryFramework;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customGuidance?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
