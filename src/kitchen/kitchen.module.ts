import { Module } from '@nestjs/common';
import { KitchenQueueController } from './presentation/controllers/kitchen-queue.controller.js';
import { ListKitchenQueueUseCase } from './application/use-cases/list-kitchen-queue.js';
import { OrdersModule } from '../orders/orders.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';

@Module({
  imports: [OrdersModule, CatalogModule],
  controllers: [KitchenQueueController],
  providers: [ListKitchenQueueUseCase],
})
export class KitchenModule {}
