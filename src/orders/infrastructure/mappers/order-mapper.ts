import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';
import { EOrderItemStatus } from '../../domain/enums/order-item-status.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import type { Prisma } from '../../../prisma/generated/client.js';

export type TOrderRow = Prisma.OrderGetPayload<{
  include: { items: true; cancellations: true };
}>;

const ORDER_STATUSES = new Set<string>(Object.values(EOrderStatus));
const ORDER_TYPES = new Set<string>(Object.values(EOrderType));
const PAYMENT_TYPES = new Set<string>(Object.values(EPaymentType));
const ITEM_STATUSES = new Set<string>(Object.values(EOrderItemStatus));

function parseOrderStatus(value: string): EOrderStatus {
  if (!ORDER_STATUSES.has(value)) {
    throw new Error(`Unknown order status: ${value}`);
  }
  return value as EOrderStatus;
}

function parseOrderType(value: string): EOrderType {
  if (!ORDER_TYPES.has(value)) {
    throw new Error(`Unknown order type: ${value}`);
  }
  return value as EOrderType;
}

function parsePaymentType(value: string): EPaymentType {
  if (!PAYMENT_TYPES.has(value)) {
    throw new Error(`Unknown payment type: ${value}`);
  }
  return value as EPaymentType;
}

function parseItemStatus(value: string | null): EOrderItemStatus | undefined {
  if (value === null) {
    return undefined;
  }
  if (!ITEM_STATUSES.has(value)) {
    throw new Error(`Unknown order item status: ${value}`);
  }
  return value as EOrderItemStatus;
}

export function orderRowToDomain(row: TOrderRow): Order {
  return Order.restore({
    id: row.id,
    userId: row.userId,
    type: parseOrderType(row.type),
    paymentType:
      row.paymentType === null ? undefined : parsePaymentType(row.paymentType),
    createdAt: row.createdAt,
    tableId: row.tableId ?? undefined,
    customerName: row.customerName ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    status: parseOrderStatus(row.status),
    deliveredAt: row.deliveredAt ?? undefined,
    closedAt: row.closedAt ?? undefined,
    items: row.items
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) =>
        OrderItems.restore({
          id: item.id,
          orderId: item.orderId,
          itemId: item.itemId,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          requiresPreparation: item.requiresPreparation,
          createdAt: item.createdAt,
          status: parseItemStatus(item.status),
          flavors: item.flavors,
          notes: item.notes ?? undefined,
        }),
      ),
    cancellationHistory: row.cancellations.map((cancellation) => ({
      itemId: cancellation.itemId,
      reason: cancellation.reason,
      cancelledAt: cancellation.cancelledAt,
    })),
  });
}

function itemsToNestedCreate(
  order: Order,
): Prisma.OrderItemCreateWithoutOrderInput[] {
  return order.getItems().map((item) => ({
    id: item.getId(),
    itemId: item.getItemId(),
    unitPrice: item.getUnitPrice(),
    quantity: item.getQuantity(),
    status: item.getStatus() ?? null,
    requiresPreparation: item.getRequiresPreparation(),
    flavors: [...item.getFlavors()],
    notes: item.getNotes().length > 0 ? item.getNotes() : null,
    createdAt: item.getCreatedAt(),
  }));
}

function cancellationsToNestedCreate(
  order: Order,
): Prisma.OrderCancellationCreateWithoutOrderInput[] {
  return order.getCancellationHistory().map((entry) => ({
    itemId: entry.itemId,
    reason: entry.reason,
    cancelledAt: entry.cancelledAt,
  }));
}

function notesOrNull(order: Order): string | null {
  const notes = order.getNotes();
  return notes.length > 0 ? notes : null;
}

export function orderDomainToCreate(order: Order): Prisma.OrderCreateInput {
  return {
    id: order.getId(),
    userId: order.getUserId(),
    type: order.getType(),
    status: order.getStatus(),
    paymentType: order.getPaymentType() ?? null,
    tableId: order.getTableId() ?? null,
    customerName: order.getCustomerName() ?? null,
    phone: order.getPhone() ?? null,
    address: order.getAddress() ?? null,
    notes: notesOrNull(order),
    createdAt: order.getCreatedAt(),
    deliveredAt: order.getDeliveredAt() ?? null,
    closedAt: order.getClosedAt() ?? null,
    items: { create: itemsToNestedCreate(order) },
    cancellations: { create: cancellationsToNestedCreate(order) },
  };
}

export function orderDomainToUpdate(order: Order): Prisma.OrderUpdateInput {
  return {
    status: order.getStatus(),
    paymentType: order.getPaymentType() ?? null,
    notes: notesOrNull(order),
    deliveredAt: order.getDeliveredAt() ?? null,
    closedAt: order.getClosedAt() ?? null,
    items: {
      deleteMany: {},
      create: itemsToNestedCreate(order),
    },
    cancellations: {
      deleteMany: {},
      create: cancellationsToNestedCreate(order),
    },
  };
}
