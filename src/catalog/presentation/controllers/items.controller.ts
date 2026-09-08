import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdateItemPriceDto } from '../dtos/update-item-price.dto.js';
import { UpdateItemPriceUseCase } from '../../application/use-cases/update-item-price.js';
import { ListItemsUseCase } from '../../application/use-cases/list-items.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/items')
export class ItemsController {
  constructor(
    private readonly updateItemPriceUseCase: UpdateItemPriceUseCase,
    private readonly listItemsUseCase: ListItemsUseCase,
  ) {}

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Get()
  list() {
    return this.listItemsUseCase.execute();
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Patch(':itemId/price')
  updatePrice(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemPriceDto,
  ) {
    return this.updateItemPriceUseCase.execute({ itemId, price: dto.price });
  }
}
