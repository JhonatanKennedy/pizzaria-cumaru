import { Body, Controller, Param, Post, Delete, Get } from '@nestjs/common';
// import { CreateOrderUseCase } from '../../application/use-cases/create-order.ts';
// import { AddItemToOrderUseCase } from '../../application/use-cases/add-item-to-order.ts';
import { CreateOrderDto } from '../dtos/create-order.dto.js';

@Controller('/orders')
export class OrdersController {
  constructor(
    // private readonly createOrderUseCase: CreateOrderUseCase,
    // private readonly addItemToOrderUseCase: AddItemToOrderUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    // return this.createOrderUseCase.execute(dto);
    return 'teste';
  }

  //   @Post(':orderId/items')
  //   addItem(@Param('orderId') orderId: string, @Body() dto: AddItemToOrderDto) {
  //     return this.addItemToOrderUseCase.execute({ orderId, ...dto });
  //   }

  @Get()
  listOrders() {
    return 'teste';
  }
}
