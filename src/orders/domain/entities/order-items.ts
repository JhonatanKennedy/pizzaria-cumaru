import { EOrderItemStatus } from '../enums/order-item-status.js';

export interface CreateOrderItemParams {
  id: string;
  orderId: string;
  itemId: string;
  unitPrice: number;
  quantity: number;
}

export class OrderItems {
  private constructor(
    private readonly id: string,
    private readonly orderId: string,
    private readonly itemId: string,
    private readonly unitPrice: number,
    private quantity: number,
    private status: EOrderItemStatus,
  ) {}

  static create(params: CreateOrderItemParams): OrderItems {
    if (params.quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (params.unitPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }

    return new OrderItems(
      params.id,
      params.orderId,
      params.itemId,
      params.unitPrice,
      params.quantity,
      EOrderItemStatus.PENDING,
    );
  }

  increaseQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    this.quantity += quantity;
  }

  decreaseQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (this.quantity - quantity < 1) {
      throw new Error('Quantity cannot be less than one');
    }

    this.quantity -= quantity;
  }

  changeStatus(status: EOrderItemStatus): void {
    this.status = status;
  }

  get totalPrice(): number {
    return this.unitPrice * this.quantity;
  }

  getId(): string {
    return this.id;
  }

  getItemId(): string {
    return this.itemId;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getUnitPrice(): number {
    return this.unitPrice;
  }

  getStatus(): EOrderItemStatus {
    return this.status;
  }
}
