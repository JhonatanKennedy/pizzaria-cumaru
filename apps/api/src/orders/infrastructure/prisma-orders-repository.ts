import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import {
  IOrdersRepository,
  IOrderListingEntry,
} from '../domain/repositories/orders-repository.js';
import { Order } from '../domain/entities/orders.js';
import { dayWindow } from '../domain/day-window.js';
import { IN_PROGRESS_STATUSES_BY_TYPE } from '../domain/order-progress.js';
import {
  SALES_INSTANT_FIELD_BY_TYPE,
  SALES_STATUSES_BY_TYPE,
} from '../domain/order-sales.js';
import { EOrderStatus } from '../domain/enums/order-status.js';
import { EOrderType } from '../domain/enums/order-type.js';
import {
  orderDomainToCreate,
  orderDomainToUpdate,
  orderRowToDomain,
} from './mappers/order-mapper.js';

const ORDER_WITH_RELATIONS = { items: true, cancellations: true } as const;

@Injectable()
export class PrismaOrdersRepository implements IOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_WITH_RELATIONS,
    });
    return row ? orderRowToDomain(row) : null;
  }

  async findAllOpen(): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { OR: this.openOrderConditions() },
      include: ORDER_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(orderRowToDomain);
  }

  async findOpenByTableId(tableId: string): Promise<Order | null> {
    const row = await this.prisma.order.findFirst({
      where: { type: EOrderType.LOCAL, status: EOrderStatus.OPEN, tableId },
      include: ORDER_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });
    return row ? orderRowToDomain(row) : null;
  }

  async save(order: Order): Promise<void> {
    try {
      await this.prisma.order.upsert({
        where: { id: order.getId() },
        update: orderDomainToUpdate(order),
        create: orderDomainToCreate(order),
      });
    } catch (error) {
      // The rule's home is CreateOrderUseCase's existence check; this catch is
      // the backstop for a table deleted between that check and this insert,
      // so the race still answers 400 rather than 500. tableId is Order's only
      // foreign key, so P2003 has no other meaning here.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new Error('Table not found');
      }
      throw error;
    }
  }

  async existsOrderForTable(tableId: string): Promise<boolean> {
    const count = await this.prisma.order.count({ where: { tableId } });
    return count > 0;
  }

  async existsTable(tableId: string): Promise<boolean> {
    const count = await this.prisma.table.count({ where: { id: tableId } });
    return count > 0;
  }
  async findCompleted(day: Date): Promise<Order[]> {
    const { start, end } = dayWindow(day);
    const rows = await this.prisma.order.findMany({
      where: this.completedWhere(start, end),
      include: ORDER_WITH_RELATIONS,
    });
    return rows.map(orderRowToDomain);
  }

  // The day's orders plus anything still in progress, so an order left open
  // overnight keeps its table reachable. Completed orders from earlier days
  // stay out — the day's trade is the sales report's job, not the listing's.
  async findAllForListing(day: Date): Promise<IOrderListingEntry[]> {
    const { start, end } = dayWindow(day);
    const rows = await this.prisma.order.findMany({
      where: {
        OR: [
          { createdAt: { gte: start, lt: end } },
          ...this.openOrderConditions(),
        ],
      },
      include: ORDER_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });
    return this.attachWaiterNames(rows);
  }

  // The day's sales share their population with the earnings report (closed
  // locals + delivered deliveries in the same day window), plus the waiter
  // attribution and items of the day's listing.
  async findDaySales(day: Date): Promise<IOrderListingEntry[]> {
    const { start, end } = dayWindow(day);
    const rows = await this.prisma.order.findMany({
      where: this.completedWhere(start, end),
      include: ORDER_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });
    return this.attachWaiterNames(rows);
  }

  // Both queries below translate the domain's rule tables into a `where`; they
  // narrow what is fetched, they never decide. Anything they over-return is
  // filtered out by the use-case predicate, which is the statement of the rule.
  private openOrderConditions(): Prisma.OrderWhereInput[] {
    return Object.values(EOrderType).map((type) => ({
      type,
      status: { in: [...IN_PROGRESS_STATUSES_BY_TYPE[type]] },
    }));
  }

  private completedWhere(start: Date, end: Date): Prisma.OrderWhereInput {
    const range = { gte: start, lt: end };
    return {
      OR: Object.values(EOrderType).map((type) => ({
        type,
        status: { in: [...SALES_STATUSES_BY_TYPE[type]] },
        [SALES_INSTANT_FIELD_BY_TYPE[type]]: range,
      })),
    };
  }

  private async attachWaiterNames(
    rows: Prisma.OrderGetPayload<{ include: typeof ORDER_WITH_RELATIONS }>[],
  ): Promise<IOrderListingEntry[]> {
    const userIds = [...new Set(rows.map((row) => row.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const nameById = new Map(users.map((user) => [user.id, user.name]));
    return rows.map((row) => ({
      order: orderRowToDomain(row),
      waiterName: nameById.get(row.userId) ?? null,
    }));
  }
}
