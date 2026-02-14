import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({ description: 'Custom title for the document' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
