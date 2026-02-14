import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsString()
  messageType?: string;
}
