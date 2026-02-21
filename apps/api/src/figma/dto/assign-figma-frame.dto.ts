import { IsString, IsOptional, MaxLength } from 'class-validator';

export class AssignFigmaFrameDto {
  @IsString()
  @MaxLength(200)
  fileKey: string;

  @IsString()
  @MaxLength(50)
  nodeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nodeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  thumbnailUrl?: string;
}
