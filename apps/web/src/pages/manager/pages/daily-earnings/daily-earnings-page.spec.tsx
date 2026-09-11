import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ApiError } from '@api/http-client';
import type { TDaySale } from '../../api/daily-sales.api';
import type { TDailyEarningsReport, TReportType } from '../../api/reports.api';
import { DailyEarningsPage } from './daily-earnings-page';

const {
  earningsMock,
  salesMock,
  menuMock,
  tablesMock,
  earningsRefetchMock,
  salesRefetchMock,
  menuRefetchMock,
  tablesRefetchMock,
} = vi.hoisted(() => ({
  earningsMock: vi.fn(),
  salesMock: vi.fn(),
  menuMock: vi.fn(),
  tablesMock: vi.fn(),
  earningsRefetchMock: vi.fn(),
  salesRefetchMock: vi.fn(),
  menuRefetchMock: vi.fn(),
  tablesRefetchMock: vi.fn(),
}));

vi.mock('../../hooks/use-daily-earnings', () => ({
  useDailyEarnings: (type?: TReportType) => earningsMock(type),
}));

vi.mock('../../hooks/use-day-sales', () => ({
  useDaySales: () => salesMock(),
}));

vi.mock('../../hooks/use-catalog', () => ({
  useCatalog: () => ({ menuQuery: menuMock() }),
}));

vi.mock('../../hooks/use-tables', () => ({
  useTables: () => tablesMock(),
}));

const CALABRESA = {
  id: 'item-calabresa',
  name: 'Calabresa',
  category: 'PIZZA',
  price: 45,
};
const COCA = {
  id: 'item-coca',
  name: 'Coca-Cola',
  category: 'DRINK',
  price: 8,
};
const MENU = [CALABRESA, COCA];

// The floor listing the cards resolve their table numbers from. The sales below
// carry these ids, not the numbers — the wire's shape, and the one that made the
// fixtures' old bare "5"/"7" hide that the card was printing an id.
const TABLES = [
  { id: 'table-uuid-5', number: 5, openOrder: null },
  { id: 'table-uuid-7', number: 7, openOrder: null },
];

const LOCAL_SALE: TDaySale = {
  id: 'sale-local',
  waiterName: 'João',
  type: 'Local',
  status: 'Completed',
  paymentType: 'Pix',
  tableId: 'table-uuid-5',
  createdAt: '2026-09-09T13:00:00Z',
  closedAt: '2026-09-09T15:00:00Z',
  deliveredAt: null,
  totalPrice: 98,
  items: [
    {
      id: 'local-line-1',
      itemId: 'item-calabresa',
      quantity: 2,
      status: 'Completed',
    },
    {
      id: 'local-line-2',
      itemId: 'item-coca',
      quantity: 1,
      status: 'Completed',
    },
  ],
};

const CASH_SALE: TDaySale = {
  id: 'sale-cash',
  waiterName: 'João',
  type: 'Local',
  status: 'Completed',
  paymentType: 'Cash',
  tableId: 'table-uuid-7',
  createdAt: '2026-09-09T12:00:00Z',
  closedAt: '2026-09-09T14:00:00Z',
  deliveredAt: null,
  totalPrice: 16,
  items: [
    {
      id: 'cash-line-1',
      itemId: 'item-coca',
      quantity: 2,
      status: 'Completed',
    },
  ],
};

const DELIVERY_SALE: TDaySale = {
  id: 'sale-delivery',
  waiterName: 'Maria Souza',
  type: 'Delivery',
  status: 'Completed',
  paymentType: null,
  createdAt: '2026-09-09T10:00:00Z',
  closedAt: null,
  deliveredAt: '2026-09-09T18:00:00Z',
  totalPrice: 45,
  items: [
    {
      id: 'delivery-line-1',
      itemId: 'item-calabresa',
      quantity: 1,
      status: 'Completed',
    },
  ],
};

const DAY_SALES = [LOCAL_SALE, CASH_SALE, DELIVERY_SALE];

function reportFor(type: TReportType | null): TDailyEarningsReport {
  if (type === 'Local') {
    return { grandTotal: 480, localTotal: 480, deliveryTotal: 0 };
  }
  if (type === 'Delivery') {
    return { grandTotal: 210, localTotal: 0, deliveryTotal: 210 };
  }
  return { grandTotal: 690, localTotal: 480, deliveryTotal: 210 };
}

interface QueryOverrides {
  data?: unknown;
  isPending?: boolean;
  error?: ApiError | null;
}

function renderPage(
  overrides: {
    earnings?: QueryOverrides;
    sales?: QueryOverrides;
    menu?: QueryOverrides;
    tables?: QueryOverrides;
  } = {},
): void {
  earningsMock.mockImplementation((type?: TReportType) => ({
    data: reportFor(type ?? null),
    isPending: false,
    error: null,
    refetch: earningsRefetchMock,
    ...(overrides.earnings ?? {}),
  }));
  salesMock.mockImplementation(() => ({
    data: DAY_SALES,
    isPending: false,
    error: null,
    refetch: salesRefetchMock,
    ...(overrides.sales ?? {}),
  }));
  menuMock.mockImplementation(() => ({
    data: MENU,
    isPending: false,
    error: null,
    refetch: menuRefetchMock,
    ...(overrides.menu ?? {}),
  }));
  tablesMock.mockImplementation(() => ({
    data: TABLES,
    isPending: false,
    error: null,
    refetch: tablesRefetchMock,
    ...(overrides.tables ?? {}),
  }));
  render(
    <MemoryRouter>
      <DailyEarningsPage />
    </MemoryRouter>,
  );
}

describe('DailyEarningsPage', () => {
  it("should show the day totals together with the day's sales", () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Relatório de Ganhos Diários' }),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 690,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 480,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 210,00')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Vendas do Dia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pizzas · 3')).toBeInTheDocument();
    expect(screen.getByText('Bebidas · 3')).toBeInTheDocument();

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
    expect(within(articles[0]).getByText('Entrega')).toBeInTheDocument();
    expect(within(articles[0]).getByText('Maria Souza')).toBeInTheDocument();
    expect(within(articles[0]).getByText('1× Calabresa')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Local')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Mesa 5')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Pix')).toBeInTheDocument();
    expect(within(articles[1]).getByText('2× Calabresa')).toBeInTheDocument();
    expect(within(articles[1]).getByText('1× Coca-Cola')).toBeInTheDocument();
    expect(within(articles[2]).getByText('Mesa 7')).toBeInTheDocument();
    expect(within(articles[2]).getByText('Dinheiro')).toBeInTheDocument();
    expect(within(articles[2]).getByText('2× Coca-Cola')).toBeInTheDocument();
  });

  it('should narrow totals and the sales list by order type', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(screen.getByRole('group', { name: 'Tipo de venda' })).getByRole(
        'button',
        {
          name: 'Local',
        },
      ),
    );

    expect(earningsMock).toHaveBeenLastCalledWith('Local');
    expect(screen.getByText('R$ 480,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 690,00')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 210,00')).not.toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(within(articles[0]).getByText('Mesa 5')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Mesa 7')).toBeInTheDocument();
    expect(within(articles[1]).getByText('2× Coca-Cola')).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('group', { name: 'Tipo de venda' })).getByRole(
        'button',
        {
          name: 'Todos',
        },
      ),
    );

    expect(earningsMock).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText('R$ 690,00')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('should narrow only the sales list by payment method', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(
        screen.getByRole('group', { name: 'Forma de pagamento' }),
      ).getByRole('button', { name: 'Pix' }),
    );

    expect(earningsMock).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText('R$ 690,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 480,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 210,00')).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(1);
    expect(within(articles[0]).getByText('Mesa 5')).toBeInTheDocument();
    expect(screen.getByText('Pizzas · 2')).toBeInTheDocument();
    expect(screen.queryByText('Bebidas · 3')).not.toBeInTheDocument();
  });

  it('should narrow only the sales list by category and keep the strip in sync', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(screen.getByRole('group', { name: 'Categoria' })).getByRole(
        'button',
        {
          name: 'Bebidas',
        },
      ),
    );

    expect(screen.getByText('R$ 690,00')).toBeInTheDocument();
    const drinkArticles = screen.getAllByRole('article');
    expect(drinkArticles).toHaveLength(2);
    expect(within(drinkArticles[0]).getByText('Mesa 5')).toBeInTheDocument();
    expect(within(drinkArticles[1]).getByText('Mesa 7')).toBeInTheDocument();
    expect(screen.getByText('Bebidas · 3')).toBeInTheDocument();
    expect(screen.queryByText('Pizzas · 3')).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole('group', { name: 'Categoria' })).getByRole(
        'button',
        {
          name: 'Pizzas',
        },
      ),
    );

    const pizzaArticles = screen.getAllByRole('article');
    expect(pizzaArticles).toHaveLength(2);
    expect(
      within(pizzaArticles[0]).getByText('Maria Souza'),
    ).toBeInTheDocument();
    expect(within(pizzaArticles[1]).getByText('Mesa 5')).toBeInTheDocument();
    expect(screen.getByText('Pizzas · 3')).toBeInTheDocument();
    expect(screen.queryByText('Bebidas · 3')).not.toBeInTheDocument();
  });

  it('should show the loading state while the sales load', () => {
    renderPage({ sales: { isPending: true } });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByText('Vendas do Dia')).not.toBeInTheDocument();
  });

  it('should show the loading state while the report loads', () => {
    renderPage({ earnings: { isPending: true } });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('should surface the sales error verbatim and retry every query', async () => {
    const user = userEvent.setup();
    renderPage({
      sales: {
        data: null,
        error: new ApiError(500, 'Falha ao buscar as vendas'),
      },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Falha ao buscar as vendas');
    await user.click(
      within(alert).getByRole('button', { name: 'Tentar novamente' }),
    );

    expect(earningsRefetchMock).toHaveBeenCalledTimes(1);
    expect(salesRefetchMock).toHaveBeenCalledTimes(1);
    expect(menuRefetchMock).toHaveBeenCalledTimes(1);
    expect(tablesRefetchMock).toHaveBeenCalledTimes(1);
  });

  it('should surface the earnings error verbatim', () => {
    renderPage({
      earnings: {
        data: null,
        error: new ApiError(500, 'Falha ao buscar o relatório de ganhos'),
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao buscar o relatório de ganhos',
    );
  });

  it('should surface a menu load failure', () => {
    renderPage({
      menu: {
        data: null,
        error: new ApiError(500, 'Falha ao buscar o cardápio'),
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao buscar o cardápio',
    );
  });

  it('should surface a floor listing failure', () => {
    renderPage({
      tables: {
        data: null,
        error: new ApiError(500, 'Falha ao buscar as mesas'),
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao buscar as mesas',
    );
  });

  it('should show no table when the floor listing does not carry it', () => {
    renderPage({ tables: { data: [] } });

    expect(screen.queryByText('Mesa 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Mesa 7')).not.toBeInTheDocument();
    // The sale carries the table's id, and an id is never a label: the card
    // has to decline the number rather than fall back to the uuid.
    expect(screen.queryByText(/table-uuid-5/)).not.toBeInTheDocument();
  });

  it('should keep the totals and show an empty message when nothing sold yet', () => {
    renderPage({ sales: { data: [] } });

    expect(screen.getByText('R$ 690,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 480,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 210,00')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Vendas do Dia' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhuma venda…')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: 'Quantidades vendidas por categoria',
      }),
    ).not.toBeInTheDocument();
  });
});
