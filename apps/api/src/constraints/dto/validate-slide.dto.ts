import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class SlideContentDto {
  @ApiProperty({ example: 'Q3 Results' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '- Revenue up 20%\n- Costs down 5%' })
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasTable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tableRows?: number;
}

export class PaletteDto {
  @ApiProperty({ example: '#1e293b' })
  @IsString()
  text!: string;

  @ApiProperty({ example: '#ffffff' })
  @IsString()
  background!: string;

  @ApiProperty({ example: '#3b82f6' })
  @IsString()
  primary!: string;

  @ApiProperty({ example: '#64748b' })
  @IsString()
  secondary!: string;

  @ApiProperty({ example: '#f59e0b' })
  @IsString()
  accent!: string;
}

export class ThemeDto {
  @ApiProperty({ example: 'Montserrat' })
  @IsString()
  headingFont!: string;

  @ApiProperty({ example: 'Inter' })
  @IsString()
  bodyFont!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PaletteDto)
  palette!: PaletteDto;
}

export class LayoutDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  columns?: number;

  @ApiPropertyOptional({ example: [28, 24, 14] })
  @IsOptional()
  @IsArray()
  fontSizes?: number[];

  @ApiPropertyOptional({ example: ['#1e293b', '#3b82f6', '#f59e0b'] })
  @IsOptional()
  @IsArray()
  distinctColors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasFullBleedImage?: boolean;

  @ApiPropertyOptional({ example: 0.3 })
  @IsOptional()
  @IsNumber()
  overlayOpacity?: number;
}

export class ValidateSlideDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => SlideContentDto)
  slide!: SlideContentDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ThemeDto)
  theme!: ThemeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => LayoutDto)
  layout?: LayoutDto;
}
