import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UpdateItemPriceDto } from '../dtos/update-item-price.dto.js';
import { CreateItemDto } from '../dtos/create-item.dto.js';
import { UpdateItemDto } from '../dtos/update-item.dto.js';
import { LinkIngredientToItemDto } from '../dtos/link-ingredient-to-item.dto.js';
import { UpdateItemPriceUseCase } from '../../application/use-cases/update-item-price.js';
import { CreateItemUseCase } from '../../application/use-cases/create-item.js';
import { UpdateItemUseCase } from '../../application/use-cases/update-item.js';
import { RemoveItemUseCase } from '../../application/use-cases/remove-item.js';
import { LinkIngredientToItemUseCase } from '../../application/use-cases/link-ingredient-to-item.js';
import { UnlinkIngredientFromItemUseCase } from '../../application/use-cases/unlink-ingredient-from-item.js';
import { ListItemsUseCase } from '../../application/use-cases/list-items.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

@Controller('/items')
export class ItemsController {
  constructor(
    private readonly updateItemPriceUseCase: UpdateItemPriceUseCase,
    private readonly createItemUseCase: CreateItemUseCase,
    private readonly updateItemUseCase: UpdateItemUseCase,
    private readonly removeItemUseCase: RemoveItemUseCase,
    private readonly linkIngredientToItemUseCase: LinkIngredientToItemUseCase,
    private readonly unlinkIngredientFromItemUseCase: UnlinkIngredientFromItemUseCase,
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
  @Post(':itemId/ingredients')
  linkIngredient(
    @Param('itemId') itemId: string,
    @Body() dto: LinkIngredientToItemDto,
  ) {
    return this.linkIngredientToItemUseCase.execute({
      itemId,
      ingredientId: dto.ingredientId,
    });
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Delete(':itemId/ingredients/:ingredientId')
  unlinkIngredient(
    @Param('itemId') itemId: string,
    @Param('ingredientId') ingredientId: string,
  ) {
    return this.unlinkIngredientFromItemUseCase.execute({
      itemId,
      ingredientId,
    });
  }

  @Roles({ roles: [EUserRole.MANAGER] })
  @Delete(':itemId')
  remove(@Param('itemId') itemId: string) {
    return this.removeItemUseCase.execute(itemId);
  }
}
