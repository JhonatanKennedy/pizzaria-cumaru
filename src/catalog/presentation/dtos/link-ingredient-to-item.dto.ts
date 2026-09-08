import { IsNotEmpty, IsString } from 'class-validator';

export class LinkIngredientToItemDto {
  @IsString()
  @IsNotEmpty()
  ingredientId: string;
}
