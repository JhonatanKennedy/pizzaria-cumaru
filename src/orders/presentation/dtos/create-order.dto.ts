import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

export class CreateOrderDto {
  userId: string;
  type: EOrderType;
  paymentType: EPaymentType;
  tableId?: string;
  notes?: string;
}
