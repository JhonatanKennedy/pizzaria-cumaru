import { IsNotEmpty, IsString } from 'class-validator';

export class RenameIngredientDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
