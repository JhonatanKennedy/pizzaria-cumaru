import { Link } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { formatBRL } from '@lib/format';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

interface TableCardProps {
  table: TTableListingEntry;
  onOpenTable: (table: TTableListingEntry) => void;
}

export function TableCard({
  table,
  onOpenTable,
}: TableCardProps): React.ReactNode {
  if (table.openOrder) {
    return (
      <Link
        to={`/waiter/orders/${table.openOrder.orderId}`}
        className="card block hover:border-red-300"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Mesa {table.number}</h2>
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
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
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">Mesa {table.number}</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
          Livre
        </span>
      </div>
      <Button onClick={() => onOpenTable(table)} className="mt-3 w-full">
        Abrir mesa
      </Button>
    </Card>
  );
}
