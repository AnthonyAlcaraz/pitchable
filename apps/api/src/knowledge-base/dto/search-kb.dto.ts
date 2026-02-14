import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNumber, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchKbDto {
  @ApiProperty({ description: 'Search query text', example: 'AI agent architecture' })
  @IsString()
  @MinLength(1)
  query: string;

  @ApiPropertyOptional({ description: 'Max results to return', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Minimum similarity threshold (0-1)', default: 0.3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number = 0.3;
}
