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
  onCancel: (
    orderId: string,
    orderItemId: string,
    reason: string,
  ) => Promise<void>;
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

  const handleCancelConfirm = async (reason: string): Promise<void> => {
    await onCancel(orderId, item.orderItemId, reason);
    setCancelOpen(false);
  };

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border border-stone-200 px-4 py-3 ${STATUS_BG[item.status]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-stone-900">{item.name}</p>
        <span className="shrink-0 text-sm font-medium text-stone-700">
          {item.quantity}×
        </span>
      </div>
      {item.parts.length > 1 && (
        <p className="text-sm text-stone-600">
          {formatComposition(item.parts)}
        </p>
      )}
      {item.notes && <p className="text-sm text-stone-600">{item.notes}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-stone-600">
          {itemStatusLabel(item.status)}
        </span>
        {item.status === 'Pending' && (
          <Button
            className="px-3 py-1.5 text-sm"
            disabled={isBusy}
            onClick={() => onStart(orderId, item.orderItemId)}
          >
            Iniciar preparo
          </Button>
        )}
        {item.status === 'Preparing' && (
          <div className="flex gap-2">
            <Button
              className="px-3 py-1.5 text-sm"
              disabled={isBusy}
              onClick={() => onFinish(orderId, item.orderItemId)}
            >
              Finalizar
            </Button>
            <Button
              className="border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-100"
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
