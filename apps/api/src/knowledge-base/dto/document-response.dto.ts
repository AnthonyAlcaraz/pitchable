import { ApiProperty } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() sourceType!: string;
  @ApiProperty({ required: false }) mimeType!: string | null;
  @ApiProperty({ required: false }) fileSize!: number | null;
  @ApiProperty() status!: string;
  @ApiProperty() chunkCount!: number;
  @ApiProperty({ required: false }) errorMessage!: string | null;
  @ApiProperty({ required: false }) sourceUrl!: string | null;
  @ApiProperty({ required: false }) processedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
