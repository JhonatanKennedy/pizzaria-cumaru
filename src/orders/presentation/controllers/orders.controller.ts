import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CancelItemDto } from '../dtos/cancel-item.dto.js';
import { CreateOrderDto } from '../dtos/create-order.dto.js';
import { AddItemToOrderDto } from '../dtos/add-item-to-order.dto.js';
import { CancelItemFromOrderUseCase } from '../../application/use-cases/cancel-item-from-order.js';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.js';
import { AddItemToOrderUseCase } from '../../application/use-cases/add-item-to-order.js';
import { UpdateDeliveryOrderStatusUseCase } from '../../application/use-cases/update-delivery-order-status.js';
import { UpdateDeliveryOrderStatusDto } from '../dtos/update-delivery-order-status.dto.js';
import { CloseOrderUseCase } from '../../application/use-cases/close-order.js';
import { CloseOrderDto } from '../dtos/close-order.dto.js';
import { ListOrdersUseCase } from '../../application/use-cases/list-orders.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';
import { Roles } from '../../../common/guards/roles.guard.js';
import { EUserRole } from '../../../users/domain/enums/user-role.js';

const PAYMENT_TYPE_BY_VALUE: Record<string, EPaymentType> = {
  Cash: EPaymentType.CASH,
  CreditCard: EPaymentType.CREDIT_CARD,
  Pix: EPaymentType.PIX,
};

@Controller('/orders')
export class OrdersController {
  constructor(
    private readonly cancelItemFromOrderUseCase: CancelItemFromOrderUseCase,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly addItemToOrderUseCase: AddItemToOrderUseCase,
    private readonly updateDeliveryOrderStatusUseCase: UpdateDeliveryOrderStatusUseCase,
    private readonly closeOrderUseCase: CloseOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
  ) {}

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.createOrderUseCase.execute(dto);
  }

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Get()
  listOrders() {
    return this.listOrdersUseCase.execute(new Date());
  }

  @Roles({
    roles: [EUserRole.MANAGER],
    message: 'Only the manager can close the order',
  })
  @Post(':orderId/close')
  close(@Param('orderId') orderId: string, @Body() dto: CloseOrderDto) {
    return this.closeOrderUseCase.execute({
      orderId,
      paymentType: PAYMENT_TYPE_BY_VALUE[dto.paymentType],
      splitInto: dto.splitInto,
    });
  }

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Post(':orderId/items')
  addItem(@Param('orderId') orderId: string, @Body() dto: AddItemToOrderDto) {
    return this.addItemToOrderUseCase.execute({ orderId, ...dto });
  }

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Patch(':orderId/status')
  updateDeliveryOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateDeliveryOrderStatusDto,
  ) {
    return this.updateDeliveryOrderStatusUseCase.execute({
      orderId,
      status: dto.status,
    });
  }

  @Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })
  @Post(':orderId/items/:itemId/cancellation')
  cancelItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CancelItemDto,
  ) {
    return this.cancelItemFromOrderUseCase.execute({
      orderId,
      itemId,
      reason: dto.reason,
    });
  }
}
