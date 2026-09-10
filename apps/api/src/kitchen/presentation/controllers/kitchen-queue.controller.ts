import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ListKitchenQueueUseCase } from '../../application/use-cases/list-kitchen-queue.js';
import { StartItemPreparationUseCase } from '../../../orders/application/use-cases/start-item-preparation.js';
import { FinishItemPreparationUseCase } from '../../../orders/application/use-cases/finish-item-preparation.js';
import { CancelItemPreparationUseCase } from '../../../orders/application/use-cases/cancel-item-preparation.js';
import { CancelItemDto } from '../../../orders/presentation/dtos/cancel-item.dto.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/kitchen')
export class KitchenQueueController {
  constructor(
    private readonly listKitchenQueueUseCase: ListKitchenQueueUseCase,
    private readonly startItemPreparationUseCase: StartItemPreparationUseCase,
    private readonly finishItemPreparationUseCase: FinishItemPreparationUseCase,
    private readonly cancelItemPreparationUseCase: CancelItemPreparationUseCase,
  ) {}

  @Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })
  @Get('queue')
  queue() {
    return this.listKitchenQueueUseCase.execute();
  }

  // The preparation verbs live here, where the cook acts. The use-cases stay in
  // orders/application (they transition the orders aggregate). Only items shown
  // in the queue can be started/finished; the domain refuses invalid transitions.
  // Features: 06_cook_profile.feature, 07_manager_profile.feature.
  @Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })
  @Post('orders/:orderId/items/:orderItemId/start')
  start(
    @Param('orderId') orderId: string,
    @Param('orderItemId') itemId: string,
  ) {
    return this.startItemPreparationUseCase.execute({ orderId, itemId });
  }

  @Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })
  @Post('orders/:orderId/items/:orderItemId/finish')
  finish(
    @Param('orderId') orderId: string,
    @Param('orderItemId') itemId: string,
  ) {
    return this.finishItemPreparationUseCase.execute({ orderId, itemId });
  }

  // Stopping a dish that was started by mistake: unlike the waiter's
  // cancellation (Pending only), this acts on "Preparing" rows and records
  // the cancellation in the order history. Pending and Ready rows are refused
  // by the domain verb.
  // Feature: 06_cook_profile.feature.
  @Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })
  @Post('orders/:orderId/items/:orderItemId/cancel')
  cancel(
    @Param('orderId') orderId: string,
    @Param('orderItemId') itemId: string,
    @Body() _dto: CancelItemDto,
  ) {
    return this.cancelItemPreparationUseCase.execute({ orderId, itemId });
  }
}
