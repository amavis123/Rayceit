import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
