import { Module } from '@nestjs/common';
import { CATALOG_REPOSITORY } from './domain/repositories/catalog-repository.js';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog-repository.js';
import { IngredientsController } from './presentation/controllers/ingredients.controller.js';
import { ItemsController } from './presentation/controllers/items.controller.js';
import { MarkIngredientOutOfStockUseCase } from './application/use-cases/mark-ingredient-out-of-stock.js';
import { MarkIngredientInStockUseCase } from './application/use-cases/mark-ingredient-in-stock.js';
import { UpdateItemPriceUseCase } from './application/use-cases/update-item-price.js';
import { ListItemsUseCase } from './application/use-cases/list-items.js';
import { ListIngredientsUseCase } from './application/use-cases/list-ingredients.js';

@Module({
  controllers: [IngredientsController, ItemsController],
  providers: [
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    MarkIngredientOutOfStockUseCase,
    MarkIngredientInStockUseCase,
    UpdateItemPriceUseCase,
    ListItemsUseCase,
    ListIngredientsUseCase,
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogModule {}
