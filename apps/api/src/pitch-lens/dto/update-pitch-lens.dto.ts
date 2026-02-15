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

export class UpdatePitchLensDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(AudienceType)
  audienceType?: AudienceType;

  @IsOptional()
  @IsEnum(PitchGoal)
  pitchGoal?: PitchGoal;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsEnum(CompanyStage)
  companyStage?: CompanyStage;

  @IsOptional()
  @IsEnum(ToneStyle)
  toneStyle?: ToneStyle;

  @IsOptional()
  @IsEnum(TechnicalLevel)
  technicalLevel?: TechnicalLevel;

  @IsOptional()
  @IsEnum(StoryFramework)
  selectedFramework?: StoryFramework;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customGuidance?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
