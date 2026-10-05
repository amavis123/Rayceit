import { IsString, Length } from 'class-validator';

export class ConfirmHandoverDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
