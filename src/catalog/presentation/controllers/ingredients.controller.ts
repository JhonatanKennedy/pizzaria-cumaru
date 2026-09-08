import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdateIngredientStockDto } from '../dtos/update-ingredient-stock.dto.js';
import { MarkIngredientOutOfStockUseCase } from '../../application/use-cases/mark-ingredient-out-of-stock.js';
import { MarkIngredientInStockUseCase } from '../../application/use-cases/mark-ingredient-in-stock.js';
import { ListIngredientsUseCase } from '../../application/use-cases/list-ingredients.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/ingredients')
export class IngredientsController {
  constructor(
    private readonly markIngredientOutOfStockUseCase: MarkIngredientOutOfStockUseCase,
    private readonly markIngredientInStockUseCase: MarkIngredientInStockUseCase,
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
}
