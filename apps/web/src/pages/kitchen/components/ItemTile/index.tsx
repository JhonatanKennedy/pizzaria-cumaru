import { useState } from 'react';
import { Button } from '@components/Button';
import { formatComposition } from '@lib/flavor-composition';
import { itemStatusLabel } from '@lib/item-labels';
import type { TKitchenQueueItem } from '../../api/kitchen.api';
import { CancelPreparationDialog } from '../CancelPreparationDialog';

const STATUS_BG: Record<TKitchenQueueItem['status'], string> = {
  Pending: 'bg-item-pending',
  Preparing: 'bg-item-preparing',
};

interface ItemTileProps {
  orderId: string;
  item: TKitchenQueueItem;
  isBusy: boolean;
  onStart: (orderId: string, orderItemId: string) => void;
  onFinish: (orderId: string, orderItemId: string) => void;
  onCancel: (orderId: string, orderItemId: string) => Promise<void>;
}

export function ItemTile({
  orderId,
  item,
  isBusy,
  onStart,
  onFinish,
  onCancel,
}: ItemTileProps): React.ReactNode {
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleCancelConfirm = async (): Promise<void> => {
    await onCancel(orderId, item.orderItemId);
    setCancelOpen(false);
  };

  // Sizes here are for a tablet propped at arm's length in a lit kitchen, not
  // for a desk: the tile reads at a glance and every control clears 44px.
  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border border-stone-200 px-4 py-3.5 ${STATUS_BG[item.status]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold text-stone-900">{item.name}</p>
        <span className="shrink-0 text-base font-semibold text-stone-700">
          {item.quantity}×
        </span>
      </div>
      {item.parts.length > 1 && (
        <p className="text-sm text-stone-600">
          {formatComposition(item.parts)}
        </p>
      )}
      {item.notes && <p className="text-sm text-stone-600">{item.notes}</p>}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-stone-600">
          {itemStatusLabel(item.status)}
        </span>
        {item.status === 'Pending' && (
          <Button
            className="flex-1 py-3 text-base md:flex-none md:py-2.5 md:text-sm"
            disabled={isBusy}
            onClick={() => onStart(orderId, item.orderItemId)}
          >
            Iniciar preparo
          </Button>
        )}
        {item.status === 'Preparing' && (
          <div className="flex flex-1 gap-2 md:flex-none">
            <Button
              className="flex-1 py-3 text-base md:flex-none md:py-2.5 md:text-sm"
              disabled={isBusy}
              onClick={() => onFinish(orderId, item.orderItemId)}
            >
              Finalizar
            </Button>
            <Button
              variant="secondary"
              className="flex-1 py-3 text-base md:flex-none md:py-2.5 md:text-sm"
              disabled={isBusy}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar preparo
            </Button>
          </div>
        )}
      </div>
      {cancelOpen && (
        <CancelPreparationDialog
          itemName={item.name}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </li>
  );
}
