import { Controller, Get } from '@nestjs/common';
import { ListKitchenQueueUseCase } from '../../application/use-cases/list-kitchen-queue.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/kitchen')
export class KitchenQueueController {
  constructor(
    private readonly listKitchenQueueUseCase: ListKitchenQueueUseCase,
  ) {}

  @Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })
  @Get('queue')
  queue() {
    return this.listKitchenQueueUseCase.execute();
  }
}
