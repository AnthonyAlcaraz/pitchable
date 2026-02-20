import { IsString, IsIn } from 'class-validator';

export class TopUpDto {
  @IsString()
  @IsIn(['pack_10', 'pack_25', 'pack_50'])
  packId!: string;
}
