import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateFromUrlDto {
  @IsString()
  @IsUrl({}, { message: 'Must be a valid Figma URL' })
  figmaUrl!: string;

  @IsString()
  @IsOptional()
  name?: string;
}
