import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import type { TTableListingEntry } from '@api/tables.api';
import { serviceOverview } from './service-overview';
import type { IServiceSources } from './service-status';

const MS_PER_MINUTE = 60 * 1000;
const NOW = new Date('2026-09-11T20:30:00.000Z');

const NO_SOURCES: IServiceSources = {
  tables: [],
  orders: [],
  menu: [],
};

interface IOrderFixture {
  type?: 'Local' | 'Delivery';
  status?: string;
  tableId?: string;
  customerName?: string;
  minutesAgo?: number;
  items?: readonly {
    itemId: string;
    status: string | null;
    quantity?: number;
  }[];
}

function table(
  number: number,
  openOrder: { orderId: string; totalPrice: number } | null = null,
): TTableListingEntry {
  return { id: `table-${number}`, number, openOrder };
}

function order(id: string, fixture: IOrderFixture = {}): TOrderListing {
  const minutesAgo = fixture.minutesAgo ?? 0;

  return {
    id,
    waiterName: 'joao.garcom',
    type: fixture.type ?? 'Local',
    status: fixture.status ?? 'Open',
    createdAt: new Date(
      NOW.getTime() - minutesAgo * MS_PER_MINUTE,
    ).toISOString(),
    totalPrice: 42.5,
    ...(fixture.tableId === undefined ? {} : { tableId: fixture.tableId }),
    ...(fixture.customerName === undefined
      ? {}
      : { customerName: fixture.customerName }),
    items: (fixture.items ?? []).map((line, index) => ({
      id: `${id}-item-${index}`,
      itemId: line.itemId,
      quantity: line.quantity ?? 1,
      status: line.status,
      unitPrice: 42.5,
      parts: [],
    })),
  };
}

function menuItem(
  id: string,
  name: string,
  category: string,
  available = true,
): TMenuListing[number] {
  return {
    id,
    name,
    description: '',
    price: 42.5,
    category,
    requiresPreparation: true,
    available,
    ingredientIds: [],
  };
}

// The catalog the kitchen fixtures name their lines against.
const MENU: TMenuListing = [
  menuItem('item-calabresa', 'Calabresa', 'Pizzas'),
  menuItem('item-agua', 'Água', 'Bebidas'),
];

describe('serviceOverview', () => {
  it('should name every part of the service and open it', () => {
    const overview = serviceOverview(NO_SOURCES, NOW);

    expect(overview.floor.label).toBe('Salão');
    expect(overview.floor.to).toBe('/waiter/tables');
    expect(overview.kitchen.label).toBe('Cozinha');
    expect(overview.kitchen.to).toBe('/kitchen');
    expect(overview.deliveries.label).toBe('Entregas');
    expect(overview.deliveries.to).toBe('/manager/delivery');
    expect(overview.menu.label).toBe('Cardápio');
    expect(overview.menu.to).toBe('/manager/menu');
  });

  describe('floor', () => {
    it('should name the table that has been open longest, with its age', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          tables: [
            table(1, { orderId: 'order-1', totalPrice: 82 }),
            table(2, { orderId: 'order-2', totalPrice: 30 }),
          ],
          orders: [
            order('order-1', { minutesAgo: 80 }),
            order('order-2', { minutesAgo: 12 }),
          ],
        },
        NOW,
      );

      expect(overview.floor.look).toEqual({
        to: '/waiter/orders/order-1',
        text: 'Mesa 1 · aberta há 1h20',
      });
    });

    it('should leave the free tables out of the service', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          tables: [table(1), table(2, { orderId: 'order-2', totalPrice: 30 })],
          orders: [order('order-2')],
        },
        NOW,
      );

      expect(overview.floor.look?.text).toBe('Mesa 2 · aberta agora');
    });

    it('should name no table while the floor is free', () => {
      const overview = serviceOverview(
        { ...NO_SOURCES, tables: [table(1), table(2)], orders: [] },
        NOW,
      );

      expect(overview.floor.look).toBeNull();
    });

    it('should keep the table without an age while the orders read is missing', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          tables: [table(1, { orderId: 'order-1', totalPrice: 82 })],
          orders: undefined,
        },
        NOW,
      );

      // The table is still the one to look at; its age is the part that is
      // missing, and guessing one would be worse than not saying.
      expect(overview.floor.look).toEqual({
        to: '/waiter/orders/order-1',
        text: 'Mesa 1',
      });
    });
  });

  describe('kitchen', () => {
    it('should name the order the kitchen has been owing longest', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('recent', {
              minutesAgo: 3,
              items: [{ itemId: 'item-agua', status: 'Pending' }],
            }),
            order('old', {
              minutesAgo: 40,
              tableId: 'table-7',
              items: [{ itemId: 'item-calabresa', status: 'Preparing' }],
            }),
          ],
          tables: [table(7, { orderId: 'old', totalPrice: 42.5 })],
          menu: MENU,
        },
        NOW,
      );

      expect(overview.kitchen.look).toEqual({
        to: null,
        text: 'Mesa 7 · 1× Calabresa',
      });
    });

    it('should name a delivery order after its customer', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('order-1', {
              type: 'Delivery',
              customerName: 'Ana',
              items: [{ itemId: 'item-calabresa', status: 'Pending' }],
            }),
          ],
          menu: MENU,
        },
        NOW,
      );

      expect(overview.kitchen.look?.text).toBe('Ana · 1× Calabresa');
    });

    it('should leave an order unnamed rather than call it a delivery when the floor is missing', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          tables: undefined,
          orders: [
            order('order-1', {
              tableId: 'table-7',
              items: [{ itemId: 'item-calabresa', status: 'Pending' }],
            }),
          ],
          menu: MENU,
        },
        NOW,
      );

      expect(overview.kitchen.look?.text).toBe('Pedido · 1× Calabresa');
    });

    it('should say how many items it did not name', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('order-1', {
              items: [
                { itemId: 'item-calabresa', status: 'Pending', quantity: 2 },
                { itemId: 'item-agua', status: 'Preparing' },
                { itemId: 'item-calabresa', status: 'Pending' },
              ],
            }),
          ],
          menu: MENU,
        },
        NOW,
      );

      expect(overview.kitchen.look?.text).toBe(
        'Pedido · 2× Calabresa, 1× Água e mais 1 item',
      );
    });

    it('should carry no age, which the listing cannot date per item', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('order-1', {
              minutesAgo: 90,
              items: [{ itemId: 'item-calabresa', status: 'Pending' }],
            }),
          ],
          menu: MENU,
        },
        NOW,
      );

      expect(overview.kitchen.look?.text).toBe('Pedido · 1× Calabresa');
    });

    it('should name nothing while the kitchen has nothing to do', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('order-1', {
              items: [
                { itemId: 'item-calabresa', status: 'Ready' },
                { itemId: 'item-agua', status: null },
              ],
            }),
          ],
          menu: MENU,
        },
        NOW,
      );

      expect(overview.kitchen.look).toBeNull();
    });

    it('should name the order without its items while the catalog is missing', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('order-1', {
              items: [{ itemId: 'item-calabresa', status: 'Pending' }],
            }),
          ],
          menu: undefined,
        },
        NOW,
      );

      expect(overview.kitchen.look?.text).toBe('Pedido');
    });
  });

  describe('deliveries', () => {
    it('should name the delivery furthest along the clock, with its step and age', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('recent', {
              type: 'Delivery',
              status: 'Out for delivery',
              minutesAgo: 4,
            }),
            order('old', {
              type: 'Delivery',
              customerName: 'Ana',
              status: 'Out for delivery',
              minutesAgo: 12,
            }),
          ],
        },
        NOW,
      );

      expect(overview.deliveries.look).toEqual({
        to: '/manager/delivery/old',
        text: 'Ana · Saiu para entrega · há 12 min',
      });
    });

    it('should leave out a delivery that has landed or been cancelled', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [
            order('landed', { type: 'Delivery', status: 'Delivered' }),
            order('cancelled', { type: 'Delivery', status: 'Cancelled' }),
            order('local', { status: 'Open' }),
          ],
        },
        NOW,
      );

      expect(overview.deliveries.look).toBeNull();
    });

    it('should still name a delivery whose customer was not recorded', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          orders: [order('order-1', { type: 'Delivery', status: 'Open' })],
        },
        NOW,
      );

      expect(overview.deliveries.look?.text).toBe('Entrega · Aberta · agora');
    });
  });

  describe('menu', () => {
    it('should carry no record, because nothing in the catalog waits', () => {
      const overview = serviceOverview(
        {
          ...NO_SOURCES,
          menu: [
            menuItem('item-1', 'Calabresa', 'Pizzas', false),
            menuItem('item-2', 'Água', 'Bebidas', false),
          ],
        },
        NOW,
      );

      expect(overview.menu.look).toBeNull();
    });
  });

  describe('the state line', () => {
    it('should say what every part of the service is doing', () => {
      const overview = serviceOverview(
        {
          tables: [table(1, { orderId: 'order-1', totalPrice: 10 }), table(2)],
          orders: [
            order('order-1', {
              items: [{ itemId: 'item-agua', status: 'Ready' }],
            }),
            order('order-2', {
              type: 'Delivery',
              customerName: 'Ana',
              status: 'Out for delivery',
              items: [{ itemId: 'item-agua', status: 'Pending' }],
            }),
          ],
          menu: [menuItem('item-1', 'Suco', 'Bebidas', false)],
        },
        NOW,
      );

      expect(overview.floor.state).toBe('1 de 2 mesas ocupadas');
      expect(overview.kitchen.state).toBe('1 item na cozinha');
      expect(overview.deliveries.state).toBe('1 entrega em andamento');
      expect(overview.menu.state).toBe('1 item indisponível');
    });

    it('should say nothing it cannot know while the reads are out', () => {
      const overview = serviceOverview(
        { tables: undefined, orders: undefined, menu: undefined },
        NOW,
      );

      // Null state and no record: a line whose read has not landed is a name and
      // a skeleton, never a zero it made up.
      expect(overview).toEqual({
        floor: {
          label: 'Salão',
          to: '/waiter/tables',
          state: null,
          look: null,
        },
        kitchen: { label: 'Cozinha', to: '/kitchen', state: null, look: null },
        deliveries: {
          label: 'Entregas',
          to: '/manager/delivery',
          state: null,
          look: null,
        },
        menu: {
          label: 'Cardápio',
          to: '/manager/menu',
          state: null,
          look: null,
        },
      });
    });
  });
});
