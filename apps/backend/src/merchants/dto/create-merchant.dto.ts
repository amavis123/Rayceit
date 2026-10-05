import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  businessName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}
