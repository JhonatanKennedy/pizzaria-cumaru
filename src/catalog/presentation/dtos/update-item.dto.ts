import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// The update contract has no category field on purpose: an item keeps the
// category it was created with, and the whitelist strips any category sent.
export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  requiresPreparation?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredientIds?: string[];
}
