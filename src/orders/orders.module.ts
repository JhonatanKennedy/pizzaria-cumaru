import { Module } from '@nestjs/common';
import { OrdersController } from './presentation/controllers/orders.controller.js';
import { StartItemPreparationUseCase } from './application/use-cases/start-item-preparation.js';
import { FinishItemPreparationUseCase } from './application/use-cases/finish-item-preparation.js';
import { CancelItemFromOrderUseCase } from './application/use-cases/cancel-item-from-order.js';
import { CancelItemPreparationUseCase } from './application/use-cases/cancel-item-preparation.js';
import { CreateOrderUseCase } from './application/use-cases/create-order.js';
import { AddItemToOrderUseCase } from './application/use-cases/add-item-to-order.js';
import { UpdateDeliveryOrderStatusUseCase } from './application/use-cases/update-delivery-order-status.js';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.js';
import { UpdateOrderItemQuantityUseCase } from './application/use-cases/update-order-item-quantity.js';
import { CloseOrderUseCase } from './application/use-cases/close-order.js';
import { ListOrdersUseCase } from './application/use-cases/list-orders.js';
import { GetDailyEarningsReportUseCase } from './application/use-cases/get-daily-earnings-report.js';
import { ReportsController } from './presentation/controllers/reports.controller.js';
import { ORDERS_REPOSITORY } from './domain/repositories/orders-repository.js';
import { PrismaOrdersRepository } from './infrastructure/prisma-orders-repository.js';
import { CatalogModule } from '../catalog/catalog.module.js';

@Module({
  imports: [CatalogModule],
  controllers: [OrdersController, ReportsController],
  providers: [
    StartItemPreparationUseCase,
    FinishItemPreparationUseCase,
    CancelItemPreparationUseCase,
    CancelItemFromOrderUseCase,
    CancelOrderUseCase,
    UpdateOrderItemQuantityUseCase,
    CreateOrderUseCase,
    AddItemToOrderUseCase,
    UpdateDeliveryOrderStatusUseCase,
    CloseOrderUseCase,
    ListOrdersUseCase,
    GetDailyEarningsReportUseCase,
    { provide: ORDERS_REPOSITORY, useClass: PrismaOrdersRepository },
  ],
  exports: [
    ORDERS_REPOSITORY,
    StartItemPreparationUseCase,
    FinishItemPreparationUseCase,
    CancelItemPreparationUseCase,
    CancelOrderUseCase,
    UpdateOrderItemQuantityUseCase,
  ],
})
export class OrdersModule {}
