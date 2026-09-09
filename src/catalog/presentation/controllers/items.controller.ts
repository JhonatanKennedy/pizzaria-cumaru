import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateItemDto } from '../dtos/create-item.dto.js';
import { UpdateItemDto } from '../dtos/update-item.dto.js';
import { CreateItemUseCase } from '../../application/use-cases/create-item.js';
import { UpdateItemUseCase } from '../../application/use-cases/update-item.js';
import { RemoveItemUseCase } from '../../application/use-cases/remove-item.js';
import { ListItemsUseCase } from '../../application/use-cases/list-items.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/items')
export class ItemsController {
  constructor(
    private readonly createItemUseCase: CreateItemUseCase,
    private readonly updateItemUseCase: UpdateItemUseCase,
    private readonly removeItemUseCase: RemoveItemUseCase,
    private readonly listItemsUseCase: ListItemsUseCase,
  ) {}

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Get()
  list() {
    return this.listItemsUseCase.execute();
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.createItemUseCase.execute(dto);
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Patch(':itemId')
  update(@Param('itemId') itemId: string, @Body() dto: UpdateItemDto) {
    return this.updateItemUseCase.execute({ itemId, ...dto });
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Delete(':itemId')
  remove(@Param('itemId') itemId: string) {
    return this.removeItemUseCase.execute(itemId);
  }
}
