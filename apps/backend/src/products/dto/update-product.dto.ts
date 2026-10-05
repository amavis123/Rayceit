import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
