import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UpdateIngredientStockDto } from '../dtos/update-ingredient-stock.dto.js';
import { CreateIngredientDto } from '../dtos/create-ingredient.dto.js';
import { RenameIngredientDto } from '../dtos/rename-ingredient.dto.js';
import { MarkIngredientOutOfStockUseCase } from '../../application/use-cases/mark-ingredient-out-of-stock.js';
import { MarkIngredientInStockUseCase } from '../../application/use-cases/mark-ingredient-in-stock.js';
import { CreateIngredientUseCase } from '../../application/use-cases/create-ingredient.js';
import { RenameIngredientUseCase } from '../../application/use-cases/rename-ingredient.js';
import { RemoveIngredientUseCase } from '../../application/use-cases/remove-ingredient.js';
import { ListIngredientsUseCase } from '../../application/use-cases/list-ingredients.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/ingredients')
export class IngredientsController {
  constructor(
    private readonly markIngredientOutOfStockUseCase: MarkIngredientOutOfStockUseCase,
    private readonly markIngredientInStockUseCase: MarkIngredientInStockUseCase,
    private readonly createIngredientUseCase: CreateIngredientUseCase,
    private readonly renameIngredientUseCase: RenameIngredientUseCase,
    private readonly removeIngredientUseCase: RemoveIngredientUseCase,
    private readonly listIngredientsUseCase: ListIngredientsUseCase,
  ) {}

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Get()
  list() {
    return this.listIngredientsUseCase.execute();
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Patch(':ingredientId/stock')
  updateStock(
    @Param('ingredientId') ingredientId: string,
    @Body() dto: UpdateIngredientStockDto,
  ) {
    if (dto.available) {
      return this.markIngredientInStockUseCase.execute(ingredientId);
    }
    return this.markIngredientOutOfStockUseCase.execute(ingredientId);
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Post()
  create(@Body() dto: CreateIngredientDto) {
    return this.createIngredientUseCase.execute(dto);
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Patch(':ingredientId')
  rename(
    @Param('ingredientId') ingredientId: string,
    @Body() dto: RenameIngredientDto,
  ) {
    return this.renameIngredientUseCase.execute({
      ingredientId,
      name: dto.name,
    });
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Delete(':ingredientId')
  remove(@Param('ingredientId') ingredientId: string) {
    return this.removeIngredientUseCase.execute(ingredientId);
  }
}
