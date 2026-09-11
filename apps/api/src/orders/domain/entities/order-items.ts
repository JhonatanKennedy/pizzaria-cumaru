import { EOrderItemStatus } from '../enums/order-item-status.js';

const MINIMUM_ITEM_QUANTITY = 1;

// One entry of a pizza composition: a flavor and the fatias it occupies on
// the pizza. The base flavor is always the first part.
export type TFlavorPart = {
  name: string;
  pieces: number;
};

// What counts as a flavor part is a rule about the pizza, not about how one
// is stored, so it lives here and not in the mapper. It is also the only
// guard on the `flavors` JSON column: a read arrives as `unknown`, and this
// decides whether the row was a composition at all.
export function isFlavorPart(value: unknown): value is TFlavorPart {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.pieces === 'number' &&
    Number.isInteger(candidate.pieces) &&
    candidate.pieces > 0
  );
}

export interface CreateOrderItemParams {
  id: string;
  orderId: string;
  itemId: string;
  unitPrice: number;
  quantity: number;
  requiresPreparation: boolean;
  createdAt: Date;
  parts?: TFlavorPart[];
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
    private readonly parts: TFlavorPart[],
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
      params.parts ?? [],
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
      params.parts ?? [],
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
  cancel(): void {
    if (this.requiresPreparation && this.status !== EOrderItemStatus.PENDING) {
      throw new Error('Cannot cancel an item in preparation');
    }
  }

  /**
   * Validates that an item in preparation can have its preparation cancelled
   * by the kitchen. Removal from the order and history recording are
   * performed by `Order.cancelPreparationItem`, the only caller.
   */
  cancelPreparation(): void {
    if (this.status !== EOrderItemStatus.PREPARING) {
      throw new Error('Cannot cancel an item not in preparation');
    }
  }

  increaseQuantity(quantity: number): void {
    if (this.status === EOrderItemStatus.READY) {
      throw new Error('Cannot change a ready item');
    }

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

  getParts(): ReadonlyArray<TFlavorPart> {
    return this.parts.map(({ name, pieces }) => ({ name, pieces }));
  }

  getNotes(): string {
    return this.notes ?? '';
  }
}
