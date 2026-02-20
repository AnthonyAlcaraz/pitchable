import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsString()
  messageType?: string;

  @IsOptional()
  @IsUUID()
  briefId?: string;

  @IsOptional()
  @IsUUID()
  lensId?: string;
}
