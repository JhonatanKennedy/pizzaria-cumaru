import { Module } from '@nestjs/common';
import { CATALOG_REPOSITORY } from './domain/repositories/catalog-repository.js';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog-repository.js';
import { IngredientsController } from './presentation/controllers/ingredients.controller.js';
import { ItemsController } from './presentation/controllers/items.controller.js';
import { MarkIngredientOutOfStockUseCase } from './application/use-cases/mark-ingredient-out-of-stock.js';
import { MarkIngredientInStockUseCase } from './application/use-cases/mark-ingredient-in-stock.js';
import { CreateItemUseCase } from './application/use-cases/create-item.js';
import { UpdateItemUseCase } from './application/use-cases/update-item.js';
import { RemoveItemUseCase } from './application/use-cases/remove-item.js';
import { CreateIngredientUseCase } from './application/use-cases/create-ingredient.js';
import { RenameIngredientUseCase } from './application/use-cases/rename-ingredient.js';
import { RemoveIngredientUseCase } from './application/use-cases/remove-ingredient.js';
import { ListItemsUseCase } from './application/use-cases/list-items.js';
import { ListIngredientsUseCase } from './application/use-cases/list-ingredients.js';

@Module({
  controllers: [IngredientsController, ItemsController],
  providers: [
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    MarkIngredientOutOfStockUseCase,
    MarkIngredientInStockUseCase,
    CreateItemUseCase,
    UpdateItemUseCase,
    RemoveItemUseCase,
    CreateIngredientUseCase,
    RenameIngredientUseCase,
    RemoveIngredientUseCase,
    ListItemsUseCase,
    ListIngredientsUseCase,
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogModule {}
