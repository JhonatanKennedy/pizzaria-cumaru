import { Module } from '@nestjs/common';
import { OrdersController } from './presentation/controllers/orders.controller.js';
// import { CreateOrderUseCase } from './application/use-cases/create-order.ts';
// import { AddItemToOrderUseCase } from './application/use-cases/add-item-to-order.ts';

@Module({
  controllers: [OrdersController],
  //   providers: [CreateOrderUseCase, AddItemToOrderUseCase /* ... */],
})
export class OrdersModule {}
