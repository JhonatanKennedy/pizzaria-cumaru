import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import type { TTableListing } from '@api/tables.api';
import { serviceStatus, type IServiceSources } from './service-status';

const NO_SOURCES: IServiceSources = {
  tables: [],
  orders: [],
  menu: [],
};

function table(
  number: number,
  openOrder: { orderId: string; totalPrice: number } | null = null,
): TTableListing[number] {
  return { id: `table-${number}`, number, openOrder };
}

function order(
  id: string,
  status: string,
  itemStatuses: (string | null)[],
  type: 'Local' | 'Delivery' = 'Local',
): TOrderListing {
  return {
    id,
    waiterName: 'joao.garcom',
    type,
    status,
    createdAt: '2026-09-11T18:00:00.000Z',
    totalPrice: 42.5,
    items: itemStatuses.map((status, index) => ({
      id: `${id}-item-${index}`,
      itemId: 'item-calabresa',
      quantity: 1,
      status,
      unitPrice: 42.5,
      parts: [],
    })),
  };
}

function menuItem(id: string, available: boolean): TMenuListing[number] {
  return {
    id,
    name: 'Calabresa',
    description: '',
    price: 42.5,
    category: 'Pizzas',
    requiresPreparation: true,
    available,
    ingredientIds: [],
  };
}

describe('serviceStatus', () => {
  it('should count the occupied tables against the size of the floor', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      tables: [
        table(1, { orderId: 'order-1', totalPrice: 42.5 }),
        table(2),
        table(3, { orderId: 'order-2', totalPrice: 30 }),
      ],
    });

    expect(status.floor).toBe('2 de 3 mesas ocupadas');
  });

  it('should say the floor is empty rather than count zero of it', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      tables: [table(1), table(2)],
    });

    expect(status.floor).toBe('Nenhuma mesa ocupada');
  });

  it('should count the items still in the kitchen across every order', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      orders: [
        order('order-1', 'Open', ['Pending', 'Preparing', 'Ready']),
        order('order-2', 'Open', ['Pending', null]),
      ],
    });

    expect(status.kitchen).toBe('3 itens na cozinha');
  });

  it('should say the kitchen is clear when nothing waits on it', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      orders: [order('order-1', 'Open', ['Ready', null])],
    });

    expect(status.kitchen).toBe('Nada na cozinha');
  });

  it('should count the menu items that are unavailable', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      menu: [menuItem('item-1', true), menuItem('item-2', false)],
    });

    expect(status.menu).toBe('1 item indisponível');
  });

  it('should say the menu is whole when nothing is out of stock', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      menu: [menuItem('item-1', true)],
    });

    expect(status.menu).toBe('Cardápio completo');
  });

  it('should count only the deliveries that still have a step to take', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      orders: [
        order('order-1', 'Open', [], 'Delivery'),
        order('order-2', 'Out for delivery', [], 'Delivery'),
        order('order-3', 'Delivered', [], 'Delivery'),
        order('order-4', 'Cancelled', [], 'Delivery'),
        // A local order is not a delivery, whatever its status.
        order('order-5', 'Open', []),
      ],
    });

    expect(status.deliveries).toBe('2 entregas em andamento');
  });

  it('should say no delivery is on its way when every one has landed', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      orders: [order('order-1', 'Delivered', [], 'Delivery')],
    });

    expect(status.deliveries).toBe('Nenhuma entrega em andamento');
  });

  it('should leave every group without a line while the reads are missing', () => {
    const status = serviceStatus({
      tables: undefined,
      orders: undefined,
      menu: undefined,
    });

    expect(status).toEqual({
      floor: null,
      kitchen: null,
      menu: null,
      deliveries: null,
    });
  });

  it('should state the groups whose read has landed while another is missing', () => {
    const status = serviceStatus({
      ...NO_SOURCES,
      tables: undefined,
      orders: [order('order-1', 'Open', [], 'Delivery')],
    });

    expect(status.floor).toBeNull();
    expect(status.deliveries).toBe('1 entrega em andamento');
  });
});
