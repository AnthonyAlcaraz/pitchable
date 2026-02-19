import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateFigmaTemplateDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MaxLength(200)
  figmaFileKey: string;
}
