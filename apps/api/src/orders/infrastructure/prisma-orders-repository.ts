import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import {
  IOrdersRepository,
  IOrderListingEntry,
} from '../domain/repositories/orders-repository.js';
import { Order } from '../domain/entities/orders.js';
import {
  orderDomainToCreate,
  orderDomainToUpdate,
  orderRowToDomain,
} from './mappers/order-mapper.js';

const ORDER_WITH_RELATIONS = { items: true, cancellations: true } as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
      where: { status: 'Open', tableId },
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
      // Only the create branch can raise a foreign-key violation, and tableId
      // is the only FK on Order — so P2003 means the table does not exist.
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
  async findCompleted(day: Date): Promise<Order[]> {
    const { start, end } = this.dayWindow(day);
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
    const { start, end } = this.dayWindow(day);
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
    const { start, end } = this.dayWindow(day);
    const rows = await this.prisma.order.findMany({
      where: this.completedWhere(start, end),
      include: ORDER_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });
    return this.attachWaiterNames(rows);
  }

  private dayWindow(day: Date): { start: Date; end: Date } {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return { start, end: new Date(start.getTime() + MS_PER_DAY) };
  }

  // Shared by the floor view's open-order query and the orders listing: an
  // order both surfaces show must answer to one definition of "in progress".
  private openOrderConditions(): Prisma.OrderWhereInput[] {
    return [
      { type: 'Local', status: 'Open' },
      {
        type: 'Delivery',
        status: { in: ['Open', 'Preparing', 'Out for delivery'] },
      },
    ];
  }

  private completedWhere(start: Date, end: Date): Prisma.OrderWhereInput {
    return {
      OR: [
        { status: 'Closed', closedAt: { gte: start, lt: end } },
        { status: 'Delivered', deliveredAt: { gte: start, lt: end } },
      ],
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
