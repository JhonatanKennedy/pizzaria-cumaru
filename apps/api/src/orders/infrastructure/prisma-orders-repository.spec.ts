import { PrismaOrdersRepository } from './prisma-orders-repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import type { TOrderRow } from './mappers/order-mapper.js';
import { Order } from '../domain/entities/orders.js';
import { OrderItems } from '../domain/entities/order-items.js';
import { EOrderStatus } from '../domain/enums/order-status.js';
import { EOrderType } from '../domain/enums/order-type.js';
import { EPaymentType } from '../domain/enums/payment-type.js';
import { EOrderItemStatus } from '../domain/enums/order-item-status.js';

// This adapter's contract has two halves: what it makes of the rows Prisma
// hands back, and what it asks Prisma for. Both are checked here against a
// double, so the suite says exactly what the adapter promises and no more —
// whether Postgres honours the `where` is Prisma's to get right, and the e2e
// suite is where a real database still has a say.
//
// Local-time constructors throughout: the day window is a local calendar day,
// and these specs must pass in any timezone.

const ORDER_ID = 'order-1';
const USER_ID = 1;
const TABLE_ID = '3';

const CREATED_AT = new Date(2026, 8, 7, 12);
const CANCELLED_AT = new Date(2026, 8, 7, 12, 30);
const SOLD_AT = new Date(2026, 8, 7, 14);

const DAY = new Date(2026, 8, 7, 9);
const DAY_START = new Date(2026, 8, 7);
const DAY_END = new Date(2026, 8, 8);

const PIZZA_PRICE = 45;
const DRINK_PRICE = 8;

const ORDER_WITH_RELATIONS = { items: true, cancellations: true };

type TItemRow = TOrderRow['items'][number];
type TCancellationRow = TOrderRow['cancellations'][number];

function makeItemRow(overrides: Partial<TItemRow> = {}): TItemRow {
  return {
    id: 'order-item-1',
    orderId: ORDER_ID,
    itemId: 'catalog-item-1',
    unitPrice: PIZZA_PRICE,
    quantity: 1,
    status: EOrderItemStatus.PREPARING,
    requiresPreparation: true,
    flavors: [],
    notes: null,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function makeCancellationRow(
  overrides: Partial<TCancellationRow> = {},
): TCancellationRow {
  return {
    id: 'cancellation-1',
    orderId: ORDER_ID,
    itemId: 'order-item-1',
    cancelledAt: CANCELLED_AT,
    ...overrides,
  };
}

function makeRow(overrides: Partial<TOrderRow> = {}): TOrderRow {
  return {
    id: ORDER_ID,
    userId: USER_ID,
    type: EOrderType.LOCAL,
    status: EOrderStatus.OPEN,
    paymentType: null,
    tableId: null,
    customerName: null,
    phone: null,
    address: null,
    notes: null,
    createdAt: CREATED_AT,
    deliveredAt: null,
    closedAt: null,
    cancelledAt: null,
    items: [],
    cancellations: [],
    ...overrides,
  };
}

function makeOrder(id = ORDER_ID): Order {
  return Order.create({
    id,
    userId: USER_ID,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
  });
}

function makeItem(id = 'order-item-1'): OrderItems {
  return OrderItems.create({
    id,
    orderId: ORDER_ID,
    itemId: 'catalog-item-1',
    unitPrice: PIZZA_PRICE,
    quantity: 1,
    requiresPreparation: true,
    createdAt: CREATED_AT,
  });
}

function makeDrink(): OrderItems {
  return OrderItems.create({
    id: 'drink-1',
    orderId: ORDER_ID,
    itemId: 'catalog-drink-1',
    unitPrice: DRINK_PRICE,
    quantity: 1,
    requiresPreparation: false,
    createdAt: CREATED_AT,
  });
}

function makePrismaDouble() {
  return {
    order: {
      findUnique: vi.fn(
        async (_args: Prisma.OrderFindUniqueArgs): Promise<TOrderRow | null> =>
          null,
      ),
      findFirst: vi.fn(
        async (_args: Prisma.OrderFindFirstArgs): Promise<TOrderRow | null> =>
          null,
      ),
      findMany: vi.fn(
        async (_args: Prisma.OrderFindManyArgs): Promise<TOrderRow[]> => [],
      ),
      upsert: vi.fn(
        async (_args: Prisma.OrderUpsertArgs): Promise<void> => undefined,
      ),
      count: vi.fn(async (_args: Prisma.OrderCountArgs): Promise<number> => 0),
    },
    table: {
      count: vi.fn(async (_args: Prisma.TableCountArgs): Promise<number> => 0),
    },
    user: {
      findMany: vi.fn(
        async (
          _args: Prisma.UserFindManyArgs,
        ): Promise<Array<{ id: number; name: string | null }>> => [],
      ),
    },
  };
}

type TPrismaDouble = ReturnType<typeof makePrismaDouble>;

function makeRepository(double: TPrismaDouble): PrismaOrdersRepository {
  return new PrismaOrdersRepository(double as unknown as PrismaService);
}

describe('PrismaOrdersRepository', () => {
  describe('reading an order', () => {
    it('should map a stored row into its aggregate', async () => {
      const double = makePrismaDouble();
      double.order.findUnique.mockResolvedValue(
        makeRow({ items: [makeItemRow()] }),
      );
      const repository = makeRepository(double);

      const order = await repository.findById(ORDER_ID);

      expect(double.order.findUnique).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        include: ORDER_WITH_RELATIONS,
      });
      expect(order?.getStatus()).toBe(EOrderStatus.OPEN);
      expect(order?.getCreatedAt().getTime()).toBe(CREATED_AT.getTime());
      expect(order?.getItems()).toHaveLength(1);
      expect(order?.getItems()[0].getStatus()).toBe(EOrderItemStatus.PREPARING);
    });

    it('should return null for an unknown id', async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);

      const order = await repository.findById('unknown-order');

      expect(order).toBeNull();
    });

    it('should map the stored cancellation history', async () => {
      const double = makePrismaDouble();
      double.order.findUnique.mockResolvedValue(
        makeRow({ cancellations: [makeCancellationRow()] }),
      );
      const repository = makeRepository(double);

      const order = await repository.findById(ORDER_ID);

      expect(order?.getCancellationHistory()).toEqual([
        { itemId: 'order-item-1', cancelledAt: CANCELLED_AT },
      ]);
    });

    it('should map a cancelled order with its time', async () => {
      const double = makePrismaDouble();
      double.order.findUnique.mockResolvedValue(
        makeRow({ status: EOrderStatus.CANCELLED, cancelledAt: CANCELLED_AT }),
      );
      const repository = makeRepository(double);

      const order = await repository.findById(ORDER_ID);

      expect(order?.getStatus()).toBe(EOrderStatus.CANCELLED);
      expect(order?.getCancelledAt()?.getTime()).toBe(CANCELLED_AT.getTime());
    });
  });

  describe('writing an order', () => {
    it('should upsert the order with its items and cancellation history', async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);
      const order = makeOrder();
      order.addItem(makeItem());

      await repository.save(order);

      expect(double.order.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ORDER_ID },
          create: expect.objectContaining({
            id: ORDER_ID,
            status: EOrderStatus.OPEN,
            items: {
              create: [expect.objectContaining({ id: 'order-item-1' })],
            },
          }),
          update: expect.objectContaining({
            status: EOrderStatus.OPEN,
            items: {
              deleteMany: {},
              create: [expect.objectContaining({ id: 'order-item-1' })],
            },
          }),
        }),
      );
    });

    it('should write a null status for an item that never enters the kitchen', async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);
      const order = makeOrder();
      order.addItem(makeDrink());

      await repository.save(order);

      expect(double.order.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({ id: 'drink-1', status: null }),
              ],
            },
          }),
        }),
      );
    });
  });

  describe('table lookups', () => {
    it('should report whether a table is registered', async () => {
      const double = makePrismaDouble();
      double.table.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      const repository = makeRepository(double);

      expect(await repository.existsTable(TABLE_ID)).toBe(true);
      expect(await repository.existsTable('404')).toBe(false);
      expect(double.table.count).toHaveBeenNthCalledWith(1, {
        where: { id: TABLE_ID },
      });
    });

    it('should report whether a table has any order', async () => {
      const double = makePrismaDouble();
      double.order.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      const repository = makeRepository(double);

      expect(await repository.existsOrderForTable(TABLE_ID)).toBe(true);
      expect(await repository.existsOrderForTable('4')).toBe(false);
      expect(double.order.count).toHaveBeenNthCalledWith(1, {
        where: { tableId: TABLE_ID },
      });
    });
  });

  describe('the open orders query', () => {
    it("should ask for every order type's in-progress statuses", async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);

      await repository.findAllOpen();

      const { where, orderBy, include } =
        double.order.findMany.mock.calls[0][0];
      expect(orderBy).toEqual({ createdAt: 'asc' });
      expect(include).toEqual(ORDER_WITH_RELATIONS);
      expect(where?.OR).toEqual([
        {
          type: EOrderType.DELIVERY,
          status: {
            in: [
              EOrderStatus.OPEN,
              EOrderStatus.PREPARING,
              EOrderStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
        { type: EOrderType.LOCAL, status: { in: [EOrderStatus.OPEN] } },
      ]);
    });

    it('should map every row it reads', async () => {
      const double = makePrismaDouble();
      double.order.findMany.mockResolvedValue([
        makeRow({ id: 'open-local', items: [makeItemRow()] }),
        makeRow({
          id: 'delivering',
          type: EOrderType.DELIVERY,
          status: EOrderStatus.OUT_FOR_DELIVERY,
        }),
      ]);
      const repository = makeRepository(double);

      const openOrders = await repository.findAllOpen();

      expect(openOrders.map((order) => order.getId())).toEqual([
        'open-local',
        'delivering',
      ]);
      expect(openOrders[0].getItems()).toHaveLength(1);
      expect(openOrders[1].getStatus()).toBe(EOrderStatus.OUT_FOR_DELIVERY);
    });

    it("should ask for a table's open order and map it", async () => {
      const double = makePrismaDouble();
      double.order.findFirst.mockResolvedValue(makeRow({ tableId: TABLE_ID }));
      const repository = makeRepository(double);

      const order = await repository.findOpenByTableId(TABLE_ID);

      expect(double.order.findFirst).toHaveBeenCalledWith({
        where: {
          type: EOrderType.LOCAL,
          status: EOrderStatus.OPEN,
          tableId: TABLE_ID,
        },
        include: ORDER_WITH_RELATIONS,
        orderBy: { createdAt: 'asc' },
      });
      expect(order?.getId()).toBe(ORDER_ID);
    });

    it('should return null when the table has no open order', async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);

      const order = await repository.findOpenByTableId(TABLE_ID);

      expect(order).toBeNull();
    });
  });

  describe('the day queries', () => {
    it("should ask for the day's orders plus anything still in progress", async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);

      await repository.findAllForListing(DAY);

      const { where, orderBy, include } =
        double.order.findMany.mock.calls[0][0];
      expect(orderBy).toEqual({ createdAt: 'asc' });
      expect(include).toEqual(ORDER_WITH_RELATIONS);
      expect(where?.OR).toEqual([
        { createdAt: { gte: DAY_START, lt: DAY_END } },
        {
          type: EOrderType.DELIVERY,
          status: {
            in: [
              EOrderStatus.OPEN,
              EOrderStatus.PREPARING,
              EOrderStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
        { type: EOrderType.LOCAL, status: { in: [EOrderStatus.OPEN] } },
      ]);
    });

    it("should ask for each type's completed statuses on its sale instant", async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);

      await repository.findCompleted(DAY);

      const { where } = double.order.findMany.mock.calls[0][0];
      expect(where?.OR).toEqual([
        {
          type: EOrderType.DELIVERY,
          status: { in: [EOrderStatus.DELIVERED] },
          deliveredAt: { gte: DAY_START, lt: DAY_END },
        },
        {
          type: EOrderType.LOCAL,
          status: { in: [EOrderStatus.CLOSED] },
          closedAt: { gte: DAY_START, lt: DAY_END },
        },
      ]);
    });

    it("should ask for the day's sales over the same completed population", async () => {
      const double = makePrismaDouble();
      const repository = makeRepository(double);

      await repository.findDaySales(DAY);

      const { where, orderBy, include } =
        double.order.findMany.mock.calls[0][0];
      expect(orderBy).toEqual({ createdAt: 'asc' });
      expect(include).toEqual(ORDER_WITH_RELATIONS);
      expect(where?.OR).toEqual([
        {
          type: EOrderType.DELIVERY,
          status: { in: [EOrderStatus.DELIVERED] },
          deliveredAt: { gte: DAY_START, lt: DAY_END },
        },
        {
          type: EOrderType.LOCAL,
          status: { in: [EOrderStatus.CLOSED] },
          closedAt: { gte: DAY_START, lt: DAY_END },
        },
      ]);
    });

    it("should map the day's sales with payment and sale time", async () => {
      const double = makePrismaDouble();
      double.order.findMany.mockResolvedValue([
        makeRow({
          id: 'sold-local',
          status: EOrderStatus.CLOSED,
          paymentType: EPaymentType.PIX,
          closedAt: SOLD_AT,
        }),
        makeRow({
          id: 'sold-delivery',
          type: EOrderType.DELIVERY,
          status: EOrderStatus.DELIVERED,
          deliveredAt: SOLD_AT,
        }),
      ]);
      const repository = makeRepository(double);

      const sales = await repository.findDaySales(DAY);

      expect(sales.map((entry) => entry.order.getId())).toEqual([
        'sold-local',
        'sold-delivery',
      ]);
      expect(sales[0].order.getPaymentType()).toBe(EPaymentType.PIX);
      expect(sales[0].order.getClosedAt()?.getTime()).toBe(SOLD_AT.getTime());
      expect(sales[1].order.getPaymentType()).toBeUndefined();
      expect(sales[1].order.getDeliveredAt()?.getTime()).toBe(
        SOLD_AT.getTime(),
      );
    });

    it("should name the waiter of each of the day's orders", async () => {
      const double = makePrismaDouble();
      double.order.findMany.mockResolvedValue([
        makeRow({ id: 'listed-order', userId: 7 }),
      ]);
      double.user.findMany.mockResolvedValue([{ id: 7, name: 'João Garçom' }]);
      const repository = makeRepository(double);

      const listing = await repository.findAllForListing(DAY);

      expect(double.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [7] } },
      });
      expect(listing).toHaveLength(1);
      expect(listing[0].order.getId()).toBe('listed-order');
      expect(listing[0].waiterName).toBe('João Garçom');
    });

    it('should look up each waiter once however many orders they have', async () => {
      const double = makePrismaDouble();
      double.order.findMany.mockResolvedValue([
        makeRow({ id: 'first-order', userId: 7 }),
        makeRow({ id: 'second-order', userId: 7 }),
      ]);
      double.user.findMany.mockResolvedValue([{ id: 7, name: 'João Garçom' }]);
      const repository = makeRepository(double);

      const listing = await repository.findAllForListing(DAY);

      expect(double.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [7] } },
      });
      expect(listing.map((entry) => entry.waiterName)).toEqual([
        'João Garçom',
        'João Garçom',
      ]);
    });

    it('should return a null waiter name when the user row is missing', async () => {
      const double = makePrismaDouble();
      double.order.findMany.mockResolvedValue([
        makeRow({ id: 'orphan-order', userId: 999 }),
      ]);
      const repository = makeRepository(double);

      const listing = await repository.findAllForListing(DAY);

      expect(listing[0].waiterName).toBeNull();
    });
  });

  describe('error translation', () => {
    it('should translate a foreign-key violation into a domain error on save', async () => {
      const double = makePrismaDouble();
      double.order.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint violated on the fields: (`tableId`)',
          { code: 'P2003', clientVersion: 'test' },
        ),
      );
      const repository = makeRepository(double);

      await expect(repository.save(makeOrder())).rejects.toThrow(
        'Table not found',
      );
    });

    it('should let any other known error through untouched', async () => {
      const double = makePrismaDouble();
      double.order.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );
      const repository = makeRepository(double);

      await expect(repository.save(makeOrder())).rejects.toThrow(
        'Record to update not found',
      );
    });

    it('should let an unknown failure through untouched', async () => {
      const double = makePrismaDouble();
      double.order.upsert.mockRejectedValue(new Error('Connection lost'));
      const repository = makeRepository(double);

      await expect(repository.save(makeOrder())).rejects.toThrow(
        'Connection lost',
      );
    });
  });
});
