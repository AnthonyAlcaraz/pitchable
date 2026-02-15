import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import {
  AudienceType,
  PitchGoal,
  ToneStyle,
  CompanyStage,
  TechnicalLevel,
  StoryFramework,
  ImageLayout,
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
  @IsInt()
  @Min(0)
  @Max(20)
  imageFrequency?: number;

  @IsOptional()
  @IsEnum(ImageLayout)
  imageLayout?: ImageLayout;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(6)
  maxBulletsPerSlide?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(120)
  maxWordsPerSlide?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
