import { EOrderStatus } from '../enums/order-status.js';
import { EOrderType } from '../enums/order-type.js';
import { EPaymentType } from '../enums/payment-type.js';
import { OrderItems } from './order-items.js';

export type TCreateOrderParams = {
  id: string; //TODO will be removed
  userId: number;
  type: EOrderType;
  paymentType?: EPaymentType;
  createdAt: Date;
  tableId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export interface ICancellationHistoryEntry {
  itemId: string;
  reason: string;
  cancelledAt: Date;
}

export interface TRestoreOrderParams {
  id: string;
  userId: number;
  type: EOrderType;
  paymentType?: EPaymentType;
  createdAt: Date;
  tableId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: EOrderStatus;
  deliveredAt?: Date;
  closedAt?: Date;
  items: OrderItems[];
  cancellationHistory: ICancellationHistoryEntry[];
}

export class Order {
  private constructor(
    private readonly id: string,
    private readonly userId: number,
    private items: OrderItems[],
    private status: EOrderStatus,
    private readonly type: EOrderType,
    private paymentType: EPaymentType | undefined,
    private readonly createdAt: Date,
    private readonly cancellationHistory: ICancellationHistoryEntry[],
    private readonly tableId?: string,
    private readonly customerName?: string,
    private readonly phone?: string,
    private readonly address?: string,
    private notes?: string,
    private deliveredAt?: Date,
    private closedAt?: Date,
  ) {}

  static create(params: TCreateOrderParams): Order {
    if (params.type === EOrderType.DELIVERY) {
      if (!params.customerName?.trim()) {
        throw new Error('Customer name is required for delivery');
      }
      if (!params.address?.trim()) {
        throw new Error('Delivery address is required for delivery');
      }
    }

    return new Order(
      params.id,
      params.userId,
      [],
      EOrderStatus.OPEN,
      params.type,
      params.paymentType,
      params.createdAt,
      [],
      params.tableId,
      params.customerName,
      params.phone,
      params.address,
      params.notes,
      undefined,
      undefined,
    );
  }

  static restore(params: TRestoreOrderParams): Order {
    return new Order(
      params.id,
      params.userId,
      params.items,
      params.status,
      params.type,
      params.paymentType,
      params.createdAt,
      params.cancellationHistory,
      params.tableId,
      params.customerName,
      params.phone,
      params.address,
      params.notes,
      params.deliveredAt,
      params.closedAt,
    );
  }

  addItem(item: OrderItems): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Cannot change a closed order');
    }

    this.items.push(item);
  }

  removeItem(itemId: string): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Cannot change a closed order');
    }

    this.items = this.items.filter((item) => item.getId() !== itemId);
  }

  cancelItem(itemId: string, reason: string, cancelledAt: Date): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Cannot change a closed order');
    }

    const item = this.items.find((entry) => entry.getId() === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    item.cancel(reason);
    this.recordCancellation(itemId, reason, cancelledAt);
  }

  cancelPreparationItem(
    itemId: string,
    reason: string,
    cancelledAt: Date,
  ): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Cannot change a closed order');
    }

    const item = this.items.find((entry) => entry.getId() === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    item.cancelPreparation(reason);
    this.recordCancellation(itemId, reason, cancelledAt);
  }

  private recordCancellation(
    itemId: string,
    reason: string,
    cancelledAt: Date,
  ): void {
    this.items = this.items.filter((entry) => entry.getId() !== itemId);
    this.cancellationHistory.push({ itemId, reason, cancelledAt });
  }

  startDeliveryPreparation(): void {
    this.assertDeliveryOrder();
    if (this.status !== EOrderStatus.OPEN) {
      throw new Error('Invalid delivery status transition');
    }
    this.status = EOrderStatus.PREPARING;
  }

  sendOutForDelivery(): void {
    this.assertDeliveryOrder();
    if (this.status !== EOrderStatus.PREPARING) {
      throw new Error('Invalid delivery status transition');
    }
    this.status = EOrderStatus.OUT_FOR_DELIVERY;
  }

  markDelivered(deliveredAt: Date): void {
    this.assertDeliveryOrder();
    if (this.status !== EOrderStatus.OUT_FOR_DELIVERY) {
      throw new Error('Invalid delivery status transition');
    }
    this.status = EOrderStatus.DELIVERED;
    this.deliveredAt = deliveredAt;
  }

  private assertDeliveryOrder(): void {
    if (this.type !== EOrderType.DELIVERY) {
      throw new Error('Only delivery orders can enter the delivery cycle');
    }
  }

  close(paymentType: EPaymentType, closedAt: Date): void {
    if (this.status === EOrderStatus.CLOSED) {
      throw new Error('Order is already closed');
    }
    if (this.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    this.status = EOrderStatus.CLOSED;
    this.paymentType = paymentType;
    this.closedAt = closedAt;
  }

  get totalPrice(): number {
    return this.items.reduce((total, item) => total + item.totalPrice, 0);
  }

  getId(): string {
    return this.id;
  }

  getUserId(): number {
    return this.userId;
  }

  getItems(): ReadonlyArray<OrderItems> {
    return this.items;
  }

  getStatus(): EOrderStatus {
    return this.status;
  }

  getType(): EOrderType {
    return this.type;
  }

  getPaymentType(): EPaymentType | undefined {
    return this.paymentType;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getTableId(): string | undefined {
    return this.tableId;
  }

  getCustomerName(): string | undefined {
    return this.customerName;
  }

  getPhone(): string | undefined {
    return this.phone;
  }

  getAddress(): string | undefined {
    return this.address;
  }

  getDeliveredAt(): Date | undefined {
    return this.deliveredAt;
  }

  getClosedAt(): Date | undefined {
    return this.closedAt;
  }

  getNotes(): string {
    return this.notes ?? '';
  }

  getCancellationHistory(): ReadonlyArray<ICancellationHistoryEntry> {
    return this.cancellationHistory;
  }
}
