import { categoryLabel } from '@lib/catalog';
import { formatBRL, formatTime } from '@lib/format';
import { paymentLabel } from '@lib/payment-labels';
import { orderTypeLabel } from '@pages/manager/business/labels';
import { saleTimeOf } from '@pages/manager/business/filter-sales';
import type { TEnrichedSale } from '@pages/manager/business/enrich-sales';

export interface SaleCardProps {
  sale: TEnrichedSale;
}

export function SaleCard({ sale }: SaleCardProps): React.ReactNode {
  return (
    <article className="card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span className="rounded bg-stone-100 px-2 py-0.5 font-medium text-stone-800">
            {orderTypeLabel(sale.type)}
          </span>
          {sale.type === 'Local' && sale.tableNumber !== null && (
            <span>Mesa {sale.tableNumber}</span>
          )}
          <span>
            {sale.paymentType !== null ? paymentLabel(sale.paymentType) : '—'}
          </span>
          <span>{formatTime(saleTimeOf(sale))}</span>
        </div>
        <p className="text-lg font-bold text-stone-900">
          {formatBRL(sale.totalPrice)}
        </p>
      </div>
      <p className="text-sm text-stone-600">{sale.waiterName ?? '—'}</p>
      <ul className="divide-y divide-stone-100">
        {sale.items.map((line) => (
          <li
            key={line.id}
            className="flex items-center justify-between gap-2 py-1 text-sm"
          >
            <span>
              <span className="font-medium text-stone-900">
                {line.quantity}× {line.name}
              </span>
              {line.category !== null && (
                <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                  {categoryLabel(line.category)}
                </span>
              )}
            </span>
            {line.unitPrice !== null && (
              <span className="text-stone-600">
                {formatBRL(line.unitPrice * line.quantity)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
