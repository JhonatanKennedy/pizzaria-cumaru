import { Link } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { formatBRL } from '@lib/format';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

interface TableCardProps {
  table: TTableListingEntry;
  busy?: boolean;
  onOpenTable: (table: TTableListingEntry) => void;
}

export function TableCard({
  table,
  busy = false,
  onOpenTable,
}: TableCardProps): React.ReactNode {
  if (table.openOrder) {
    return (
      <Link
        to={`/waiter/orders/${table.openOrder.orderId}`}
        className="card block p-4 hover:border-red-300 focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none md:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-stone-900">Mesa {table.number}</h2>
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-stone-700">
            Aberta
          </span>
        </div>
        <p className="mt-3 font-semibold text-stone-900">
          {formatBRL(table.openOrder.totalPrice)}
        </p>
      </Link>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-stone-900">Mesa {table.number}</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-stone-600">
          Livre
        </span>
      </div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => onOpenTable(table)}
        className="mt-3 w-full py-3"
      >
        {busy ? 'Abrindo…' : 'Abrir mesa'}
      </Button>
    </Card>
  );
}
