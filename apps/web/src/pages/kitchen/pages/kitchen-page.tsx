import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { toErrorMessage } from '@lib/errors';
import { useAuth } from '@pages/auth/use-auth';
import { QueueColumn } from '../components/QueueColumn';
import { useCancelItemPreparation } from '../hooks/use-cancel-item-preparation';
import { useFinishPreparation } from '../hooks/use-finish-preparation';
import { useKitchenQueue } from '../hooks/use-kitchen-queue';
import { useStartPreparation } from '../hooks/use-start-preparation';

export function KitchenPage(): React.ReactNode {
  const { user } = useAuth();
  const queueQuery = useKitchenQueue();
  const startPreparation = useStartPreparation();
  const finishPreparation = useFinishPreparation();
  const cancelPreparation = useCancelItemPreparation();

  // One instance of each mutation feeds both columns; a tile is busy only
  // while its own orderItemId is pending, keeping tiles independent.
  const isTileBusy = (orderItemId: string): boolean => {
    return (
      (startPreparation.isPending &&
        startPreparation.variables?.orderItemId === orderItemId) ||
      (finishPreparation.isPending &&
        finishPreparation.variables?.orderItemId === orderItemId) ||
      (cancelPreparation.isPending &&
        cancelPreparation.variables?.orderItemId === orderItemId)
    );
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
            void queueQuery.refetch();
          }}
        >
          Atualizar
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

      {queueQuery.isPending && <p className="text-stone-600">Carregando…</p>}

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
            title="Entrega"
            orders={queueQuery.data.delivery}
            isBusy={isTileBusy}
            onStart={handleStart}
            onFinish={handleFinish}
            onCancel={handleCancel}
          />
          <QueueColumn
            title="Local"
            orders={queueQuery.data.local}
            isBusy={isTileBusy}
            onStart={handleStart}
            onFinish={handleFinish}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
