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
  DeckArchetype,
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
  @IsInt()
  @Min(0)
  @Max(20)
  backgroundImageFrequency?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  sidePanelImageFrequency?: number;

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
  @IsInt()
  @Min(2)
  @Max(8)
  maxTableRows?: number;

  @IsOptional()
  @IsEnum(DeckArchetype)
  deckArchetype?: DeckArchetype;

  @IsOptional()
  @IsBoolean()
  showSectionLabels?: boolean;

  @IsOptional()
  @IsBoolean()
  showOutlineSlide?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  figmaFileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  figmaAccessToken?: string;

  @IsOptional()
  @IsString()
  figmaTemplateId?: string;
}
