import { EOrderStatus } from '../enums/order-status.js';
import { EOrderType } from '../enums/order-type.js';
import { EPaymentType } from '../enums/payment-type.js';
import { OrderItems } from './order-items.js';

export type TCreateOrderParams = {
  id: string; //TODO will be removed
  userId: string;
  type: EOrderType;
  paymentType: EPaymentType;
  notes?: string;
};

export class Order {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private items: OrderItems[],
    private status: EOrderStatus,
    private type: EOrderType,
    private paymentType: EPaymentType,
    private notes?: string,
  ) {}

  static create(params: TCreateOrderParams): Order {
    return new Order(
      params.id,
      params.userId,
      [],
      EOrderStatus.OPEN,
      params.type,
      params.paymentType,
      params.notes,
    );
  }

  addItem(item: OrderItems): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Order is closed');
    }

    this.items.push(item);
  }

  removeItem(itemId: string): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Order is closed');
    }

    this.items = this.items.filter((item) => item.getId() !== itemId);
  }

  close(): void {
    //TODO maybe this will be removed
    if (this.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    this.status = EOrderStatus.CLOSED;
  }

  get totalPrice(): number {
    return this.items.reduce((total, item) => total + item.totalPrice, 0);
  }
}
