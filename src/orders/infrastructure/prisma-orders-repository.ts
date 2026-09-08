import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
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
      where: {
        OR: [
          { type: 'Local', status: 'Open' },
          {
            type: 'Delivery',
            status: { in: ['Open', 'Preparing', 'Out for delivery'] },
          },
        ],
      },
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
    await this.prisma.order.upsert({
      where: { id: order.getId() },
      update: orderDomainToUpdate(order),
      create: orderDomainToCreate(order),
    });
  }
  async findCompleted(day: Date): Promise<Order[]> {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start.getTime() + MS_PER_DAY);
    const rows = await this.prisma.order.findMany({
      where: {
        OR: [
          { status: 'Closed', closedAt: { gte: start, lt: end } },
          { status: 'Delivered', deliveredAt: { gte: start, lt: end } },
        ],
      },
      include: ORDER_WITH_RELATIONS,
    });
    return rows.map(orderRowToDomain);
  }

  async findAllForListing(day: Date): Promise<IOrderListingEntry[]> {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start.getTime() + MS_PER_DAY);
    const rows = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: ORDER_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });
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
