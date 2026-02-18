import { IsString, MaxLength } from 'class-validator';

export class AssignFigmaFrameDto {
  @IsString()
  @MaxLength(200)
  fileKey: string;

  @IsString()
  @MaxLength(50)
  nodeId: string;
}
