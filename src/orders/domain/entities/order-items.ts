import { EOrderItemStatus } from '../enums/order-item-status.js';

const MINIMUM_ITEM_QUANTITY = 1;

export interface CreateOrderItemParams {
  id: string;
  orderId: string;
  itemId: string;
  unitPrice: number;
  quantity: number;
  requiresPreparation: boolean;
  createdAt: Date;
  flavors?: string[];
  notes?: string;
}

export type TOrderItemStatus = EOrderItemStatus | undefined;

export class OrderItems {
  private constructor(
    private readonly id: string,
    private readonly orderId: string,
    private readonly itemId: string,
    private readonly unitPrice: number,
    private quantity: number,
    private status: TOrderItemStatus,
    private readonly requiresPreparation: boolean,
    private readonly createdAt: Date,
    private readonly flavors: string[],
    private readonly notes?: string,
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
      params.requiresPreparation ? EOrderItemStatus.PENDING : undefined,
      params.requiresPreparation,
      params.createdAt,
      params.flavors ?? [],
      params.notes,
    );
  }

  static restore(
    params: CreateOrderItemParams & { status?: EOrderItemStatus },
  ): OrderItems {
    return new OrderItems(
      params.id,
      params.orderId,
      params.itemId,
      params.unitPrice,
      params.quantity,
      params.status,
      params.requiresPreparation,
      params.createdAt,
      params.flavors ?? [],
      params.notes,
    );
  }

  startPreparation(): void {
    if (this.status !== EOrderItemStatus.PENDING) {
      throw new Error('Item is not waiting for preparation');
    }
    this.status = EOrderItemStatus.PREPARING;
  }

  finishPreparation(): void {
    if (this.status !== EOrderItemStatus.PREPARING) {
      throw new Error('Item is not in preparation');
    }
    this.status = EOrderItemStatus.READY;
  }

  /**
   * Validates that this item can be cancelled. Removal from the order and
   * history recording are performed by `Order.cancelItem`, the only caller.
   */
  cancel(reason: string): void {
    if (!reason.trim()) {
      throw new Error('Cancellation reason is required');
    }

    if (this.requiresPreparation && this.status !== EOrderItemStatus.PENDING) {
      throw new Error('Cannot cancel an item in preparation');
    }
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

    if (this.quantity - quantity < MINIMUM_ITEM_QUANTITY) {
      throw new Error('Quantity cannot be less than one');
    }

    this.quantity -= quantity;
  }

  get totalPrice(): number {
    return this.unitPrice * this.quantity;
  }

  getId(): string {
    return this.id;
  }

  getOrderId(): string {
    return this.orderId;
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

  getStatus(): TOrderItemStatus {
    return this.status;
  }

  getRequiresPreparation(): boolean {
    return this.requiresPreparation;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getFlavors(): ReadonlyArray<string> {
    return this.flavors;
  }

  getNotes(): string {
    return this.notes ?? '';
  }
}
