import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ApiError } from '@api/http-client';
import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import type { TTableListing } from '@api/tables.api';
import { formatTime } from '@lib/format';
import { ManagerPage } from './manager-page';

// The three reads the overview makes, held in mutable holders so a test can
// leave one of them pending or failed the way a slow query would. Each hook
// returns the holder itself, which is exactly the slice of a query result the
// page reads.
const reads = vi.hoisted(() => ({
  tables: {
    data: undefined as TTableListing | undefined,
    isPending: false,
    error: null as Error | null,
    dataUpdatedAt: 0,
    refetch: vi.fn(() => Promise.resolve()),
  },
  orders: {
    data: undefined as TOrderListing[] | undefined,
    isPending: false,
    error: null as Error | null,
    dataUpdatedAt: 0,
    refetch: vi.fn(() => Promise.resolve()),
  },
  menu: {
    data: undefined as TMenuListing | undefined,
    isPending: false,
    error: null as Error | null,
    dataUpdatedAt: 0,
    refetch: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../hooks/use-tables', () => ({ useTables: () => reads.tables }));
vi.mock('../hooks/use-orders', () => ({ useOrders: () => reads.orders }));
vi.mock('../hooks/use-menu', () => ({ useMenu: () => reads.menu }));

// A read that has landed, at a time this test controls.
const READ_AT = new Date('2026-09-11T20:00:00.000Z').getTime();
const LATER_READ_AT = new Date('2026-09-11T20:30:00.000Z').getTime();

const TABLES: TTableListing = [
  {
    id: 'table-1',
    number: 1,
    openOrder: { orderId: 'order-1', totalPrice: 82 },
  },
  { id: 'table-2', number: 2, openOrder: null },
  {
    id: 'table-3',
    number: 3,
    openOrder: { orderId: 'order-3', totalPrice: 30 },
  },
];

type TItemFixture = {
  itemId: string;
  status: string | null;
  quantity?: number;
};

function order(
  id: string,
  fixture: {
    type?: 'Local' | 'Delivery';
    status?: string;
    tableId?: string;
    customerName?: string;
    createdAt?: string;
    items?: readonly TItemFixture[];
  },
): TOrderListing {
  return {
    id,
    waiterName: 'joao.garcom',
    type: fixture.type ?? 'Local',
    status: fixture.status ?? 'Open',
    createdAt: fixture.createdAt ?? '2026-09-11T18:00:00.000Z',
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

// Mesa 1 is eating with a pizza in the kitchen, Mesa 3 is eating, one delivery
// is on its way, one item ran out — every line of the board has something to say.
const ORDERS: TOrderListing[] = [
  order('order-1', {
    tableId: 'table-1',
    items: [
      { itemId: 'item-calabresa', status: 'Pending', quantity: 2 },
      { itemId: 'item-agua', status: 'Ready' },
    ],
  }),
  order('order-3', {
    tableId: 'table-3',
    items: [{ itemId: 'item-agua', status: 'Ready' }],
  }),
  order('order-9', {
    type: 'Delivery',
    status: 'Out for delivery',
    customerName: 'Ana',
    items: [{ itemId: 'item-calabresa', status: 'Ready' }],
  }),
];

const MENU: TMenuListing = [
  menuItem('item-calabresa', 'Calabresa', 'Pizzas'),
  menuItem('item-agua', 'Água', 'Bebidas'),
  menuItem('item-suco', 'Suco', 'Bebidas', false),
];

// Every holder starts empty, so a test that sets only what it is about cannot
// inherit the test above it.
function resetReads(): void {
  for (const read of [reads.tables, reads.orders, reads.menu]) {
    read.data = undefined;
    read.isPending = false;
    read.error = null;
    read.dataUpdatedAt = 0;
    read.refetch.mockClear();
  }
}

function loadEverything(): void {
  resetReads();
  reads.tables.data = TABLES;
  reads.orders.data = ORDERS;
  reads.menu.data = MENU;
  reads.tables.dataUpdatedAt = READ_AT;
  reads.orders.dataUpdatedAt = READ_AT;
  reads.menu.dataUpdatedAt = LATER_READ_AT;
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <ManagerPage />
    </MemoryRouter>,
  );
}

describe('ManagerPage', () => {
  it('should state what each part of the service is doing', () => {
    loadEverything();
    renderPage();

    expect(screen.getByText('2 de 3 mesas ocupadas')).toBeInTheDocument();
    expect(screen.getByText('1 item na cozinha')).toBeInTheDocument();
    expect(screen.getByText('1 entrega em andamento')).toBeInTheDocument();
    expect(screen.getByText('1 item indisponível')).toBeInTheDocument();
  });

  it('should put the parts of the service in the order the manager works them', () => {
    loadEverything();
    renderPage();

    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(
      ['Salão', 'Cozinha', 'Entregas', 'Cardápio'],
    );
  });

  it('should open each part of the service into the screen that owns it', () => {
    loadEverything();
    renderPage();

    const doors: readonly (readonly [string, string])[] = [
      ['Salão', '/waiter/tables'],
      ['Cozinha', '/kitchen'],
      ['Entregas', '/manager/delivery'],
      ['Cardápio', '/manager/menu'],
    ];

    for (const [name, href] of doors) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('should name the table that has been open longest, and open it', () => {
    loadEverything();
    renderPage();

    // Mesa 1's order is the oldest on the floor, so it is the one the manager
    // would go and ask the waiter about.
    expect(
      screen.getByRole('link', { name: /^Mesa 1 · aberta/ }),
    ).toHaveAttribute('href', '/waiter/orders/order-1');
  });

  it('should name what the kitchen has been owing longest, without a link of its own', () => {
    loadEverything();
    renderPage();

    // A kitchen order has no screen but the panel, which is already the line's
    // own door — so the look is text, not a second way to the same place.
    expect(screen.getByText('Mesa 1 · 2× Calabresa')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Calabresa/ }),
    ).not.toBeInTheDocument();
  });

  it('should name the delivery furthest along, and open it', () => {
    loadEverything();
    renderPage();

    expect(
      screen.getByRole('link', { name: /^Ana · Saiu para entrega/ }),
    ).toHaveAttribute('href', '/manager/delivery/order-9');
  });

  it('should not name a menu item, because nothing in the catalog waits', () => {
    loadEverything();
    renderPage();

    expect(screen.queryByText('Suco')).not.toBeInTheDocument();
  });

  it('should say when the board was last read, at its stalest part', () => {
    loadEverything();
    renderPage();

    // The menu's read is the newer one; the board is only as fresh as the
    // oldest of the three, and that is the time it reports.
    const oldest = formatTime(new Date(READ_AT).toISOString());
    expect(screen.getByText(`Atualizado às ${oldest}`)).toBeInTheDocument();
  });

  it('should draw every name and a skeleton while the reads are out', () => {
    resetReads();
    reads.tables.isPending = true;
    reads.orders.isPending = true;
    reads.menu.isPending = true;
    renderPage();

    expect(screen.getAllByRole('term')).toHaveLength(4);
    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Cozinha' })).toBeInTheDocument();
  });

  it('should say why a part of the service is empty when its read fails', () => {
    loadEverything();
    reads.tables.data = undefined;
    reads.tables.error = new ApiError(500, 'Falha ao carregar as mesas');
    renderPage();

    // A line with no data and a line with nothing happening look the same, and
    // only one of them is the truth — so the reason takes the state's place and
    // the rest of the board is untouched.
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao carregar as mesas',
    );
    expect(screen.queryByText(/mesas ocupadas/)).not.toBeInTheDocument();
    expect(screen.getByText('1 item na cozinha')).toBeInTheDocument();
  });

  it('should read the service again when the manager asks it to', async () => {
    loadEverything();
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(reads.tables.refetch).toHaveBeenCalledTimes(1);
    expect(reads.orders.refetch).toHaveBeenCalledTimes(1);
    expect(reads.menu.refetch).toHaveBeenCalledTimes(1);
  });

  it('should report the tap it is working on while the reads are in flight', async () => {
    loadEverything();
    reads.tables.refetch.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(screen.getByRole('button', { name: 'Atualizando…' })).toBeDisabled();
  });

  it('should ignore a second tap while it is already reading', async () => {
    loadEverything();
    reads.orders.refetch.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Atualizar' }));
    await user.click(screen.getByRole('button', { name: 'Atualizando…' }));

    expect(reads.orders.refetch).toHaveBeenCalledTimes(1);
  });
});
