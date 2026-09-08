import { IsBoolean } from 'class-validator';

export class UpdateIngredientStockDto {
  @IsBoolean()
  available: boolean;
}
