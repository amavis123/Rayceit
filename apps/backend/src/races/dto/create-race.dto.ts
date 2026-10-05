import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class RaceItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class RaceStopDto {
  @IsString()
  merchantId!: string;

  @ValidateNested({ each: true })
  @Type(() => RaceItemDto)
  @ArrayMinSize(1)
  items!: RaceItemDto[];
}

export class CreateRaceDto {
  @ValidateNested({ each: true })
  @Type(() => RaceStopDto)
  @ArrayMinSize(1)
  stops!: RaceStopDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  timeBudgetMinutes?: number;
}
