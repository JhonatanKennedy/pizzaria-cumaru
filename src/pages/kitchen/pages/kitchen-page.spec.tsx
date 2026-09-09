import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TKitchenQueue } from '../api/kitchen.api';
import { KitchenPage } from './kitchen-page';

const {
  queueQueryMock,
  refetchMock,
  startMutationErrorHolder,
  startMutateMock,
  finishMutateMock,
  cancelMutateAsyncMock,
} = vi.hoisted(() => ({
  queueQueryMock: vi.fn(),
  refetchMock: vi.fn(),
  startMutationErrorHolder: { value: null as Error | null },
  startMutateMock: vi.fn(),
  finishMutateMock: vi.fn(),
  cancelMutateAsyncMock: vi.fn(),
}));

vi.mock('../hooks/use-kitchen-queue', () => ({
  useKitchenQueue: () => queueQueryMock(),
}));

vi.mock('../hooks/use-start-preparation', () => ({
  useStartPreparation: () => ({
    isPending: false,
    error: startMutationErrorHolder.value,
    variables: null,
    mutate: startMutateMock,
  }),
}));

vi.mock('../hooks/use-finish-preparation', () => ({
  useFinishPreparation: () => ({
    isPending: false,
    error: null,
    variables: null,
    mutate: finishMutateMock,
  }),
}));

vi.mock('../hooks/use-cancel-item-preparation', () => ({
  useCancelItemPreparation: () => ({
    isPending: false,
    error: null,
    variables: null,
    mutateAsync: cancelMutateAsyncMock,
  }),
}));

const QUEUE: TKitchenQueue = {
  delivery: [
    {
      orderId: 'order-1',
      type: 'Delivery',
      createdAt: '2026-09-09T12:00:00Z',
      items: [
        {
          orderItemId: 'order-item-1',
          itemId: 'catalog-pizza-1',
          name: 'Calabresa',
          quantity: 2,
          status: 'Pending',
          createdAt: '2026-09-09T12:00:00Z',
        },
      ],
    },
  ],
  local: [
    {
      orderId: 'order-2',
      type: 'Local',
      createdAt: '2026-09-09T12:01:00Z',
      items: [
        {
          orderItemId: 'order-item-2',
          itemId: 'catalog-pizza-2',
          name: 'Portuguesa',
          quantity: 1,
          status: 'Preparing',
          createdAt: '2026-09-09T12:01:00Z',
        },
      ],
    },
  ],
};

interface QueueQueryOverrides {
  data?: TKitchenQueue | undefined;
  isPending?: boolean;
  isFetching?: boolean;
  error?: Error | null;
}

function renderPage(
  overrides: QueueQueryOverrides = {},
  startError: Error | null = null,
): void {
  startMutationErrorHolder.value = startError;
  refetchMock.mockReset();
  queueQueryMock.mockReset();
  queueQueryMock.mockReturnValue({
    data: QUEUE,
    isPending: false,
    isFetching: false,
    error: null,
    refetch: refetchMock,
    ...overrides,
  });
  render(<KitchenPage />);
}

describe('KitchenPage', () => {
  it('should show both queues with their tiles', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Painel da Cozinha' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Entrega' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Local' })).toBeInTheDocument();
    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Portuguesa')).toBeInTheDocument();
  });

  it('should show the loading state on the initial fetch only', () => {
    renderPage({ data: undefined, isPending: true, isFetching: true });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByText('Calabresa')).not.toBeInTheDocument();
  });

  it('should refresh the queues on the manual button', async () => {
    refetchMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('should disable the refresh button while a fetch is in flight', () => {
    renderPage({ isFetching: true });

    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeDisabled();
  });

  it('should surface a failed load with the backend message and a retry', async () => {
    refetchMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage({
      data: undefined,
      isPending: false,
      isFetching: false,
      error: new ApiError(500, 'Falha ao buscar a fila'),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao buscar a fila',
    );

    await user.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('should surface a failed start action above the queues', () => {
    renderPage({}, new ApiError(409, 'Item is not in preparation'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Item is not in preparation',
    );
  });
});
