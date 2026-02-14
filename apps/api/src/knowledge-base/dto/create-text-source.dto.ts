import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateTextSourceDto {
  @ApiProperty({ description: 'Raw text content to add to knowledge base' })
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  content!: string;

  @ApiPropertyOptional({ description: 'Title for the text source' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class CreateUrlSourceDto {
  @ApiProperty({ description: 'URL to fetch and add to knowledge base' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ description: 'Title for the URL source' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
