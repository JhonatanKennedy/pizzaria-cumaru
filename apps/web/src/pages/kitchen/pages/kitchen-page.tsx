import { useState } from 'react';
import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { useAuth } from '@pages/auth/use-auth';
import { QueueColumn } from '../components/QueueColumn';
import type { TPreparationAction } from '../components/ItemTile';
import { useCancelItemPreparation } from '../hooks/use-cancel-item-preparation';
import { useFinishPreparation } from '../hooks/use-finish-preparation';
import { useKitchenQueue } from '../hooks/use-kitchen-queue';
import { useStartPreparation } from '../hooks/use-start-preparation';

// The two queues the server splits the payload into, in the order the cook
// reads them. Literals, not payload — so the loading state shows the real
// headings and fakes only the tiles.
const DELIVERY_QUEUE_TITLE = 'Entrega';
const LOCAL_QUEUE_TITLE = 'Local';
const QUEUE_TITLES = [DELIVERY_QUEUE_TITLE, LOCAL_QUEUE_TITLE] as const;

const TILE_PLACEHOLDERS = [1, 2, 3] as const;

export function KitchenPage(): React.ReactNode {
  const { user } = useAuth();
  const queueQuery = useKitchenQueue();
  const startPreparation = useStartPreparation();
  const finishPreparation = useFinishPreparation();
  const cancelPreparation = useCancelItemPreparation();
  const [refreshing, setRefreshing] = useState(false);

  // One instance of each mutation feeds both columns; a tile is busy only
  // while its own orderItemId is pending, keeping tiles independent.
  const tilePendingAction = (
    orderItemId: string,
  ): TPreparationAction | null => {
    if (
      startPreparation.isPending &&
      startPreparation.variables?.orderItemId === orderItemId
    ) {
      return 'start';
    }
    if (
      finishPreparation.isPending &&
      finishPreparation.variables?.orderItemId === orderItemId
    ) {
      return 'finish';
    }
    if (
      cancelPreparation.isPending &&
      cancelPreparation.variables?.orderItemId === orderItemId
    ) {
      return 'cancel';
    }
    return null;
  };

  // The button reports the tap the cook just made, not the ambient state: the
  // board refetches itself every 15s, and a label that swapped on every poll
  // would flash all shift long.
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await queueQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Cancel errors surface inside the dialog (setError('root')); start and
  // finish failures land here above the queues, with the queues untouched.
  const actionError = startPreparation.error ?? finishPreparation.error ?? null;

  const handleStart = (orderId: string, orderItemId: string): void => {
    startPreparation.mutate({ orderId, orderItemId });
  };

  const handleFinish = (orderId: string, orderItemId: string): void => {
    finishPreparation.mutate({ orderId, orderItemId });
  };

  const handleCancel = (orderId: string, orderItemId: string): Promise<void> =>
    cancelPreparation.mutateAsync({ orderId, orderItemId });

  return (
    <div className="space-y-5">
      {/* The cook lives on this screen, so for them there is nothing behind it —
          but the manager arrives here from the hub and needs the way back. */}
      {user?.role === 'Manager' && (
        <BackLink to="/manager" label="Painel do gerente" />
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Painel da Cozinha</h1>
        <Button
          variant="secondary"
          className="px-4 py-2.5 text-sm"
          disabled={queueQuery.isFetching}
          onClick={() => {
            void handleRefresh();
          }}
        >
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </Button>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {toErrorMessage(actionError)}
        </p>
      )}

      {queueQuery.isPending && (
        <LoadingRegion className="grid gap-6 md:grid-cols-2">
          {QUEUE_TITLES.map((title) => (
            <div key={title} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-stone-900">{title}</h2>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  {TILE_PLACEHOLDERS.map((placeholder) => (
                    <Skeleton key={placeholder} className="h-24 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </LoadingRegion>
      )}

      {queueQuery.error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {toErrorMessage(queueQuery.error)}
        </p>
      )}

      {queueQuery.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <QueueColumn
            title={DELIVERY_QUEUE_TITLE}
            orders={queueQuery.data.delivery}
            pendingAction={tilePendingAction}
            onStart={handleStart}
            onFinish={handleFinish}
            onCancel={handleCancel}
          />
          <QueueColumn
            title={LOCAL_QUEUE_TITLE}
            orders={queueQuery.data.local}
            pendingAction={tilePendingAction}
            onStart={handleStart}
            onFinish={handleFinish}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
