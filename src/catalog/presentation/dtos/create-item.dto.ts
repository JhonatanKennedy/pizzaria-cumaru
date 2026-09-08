import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EItemCategory } from '../../domain/enums/item-category.js';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  price: number;

  @IsEnum(EItemCategory)
  category: EItemCategory;

  @IsBoolean()
  requiresPreparation: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredientIds?: string[];
}
