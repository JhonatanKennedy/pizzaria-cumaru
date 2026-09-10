import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class FlavorPartDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  pieces: number;
}

export class AddItemToOrderDto {
  @IsString()
  itemId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlavorPartDto)
  parts?: FlavorPartDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
