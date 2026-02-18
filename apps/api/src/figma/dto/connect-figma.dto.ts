import { IsString, MaxLength } from 'class-validator';

export class ConnectFigmaDto {
  @IsString()
  @MaxLength(500)
  accessToken: string;
}
