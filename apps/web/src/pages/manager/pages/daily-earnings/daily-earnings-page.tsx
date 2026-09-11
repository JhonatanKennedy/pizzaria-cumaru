import { useState } from 'react';
import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { toErrorMessage } from '@lib/errors';
import { formatBRL } from '@lib/format';
import type { TDailyEarningsReport, TReportType } from '../../api/reports.api';
import { enrichDaySales } from '../../business/enrich-sales';
import {
  NO_SALES_FILTERS,
  categoryQuantities,
  filterDaySales,
  sortSalesNewestFirst,
  type TDaySalesFilters,
} from '../../business/filter-sales';
import { ORDER_TYPE_LABELS as TYPE_LABELS } from '../../business/labels';
import { useCatalog } from '../../hooks/use-catalog';
import { useDailyEarnings } from '../../hooks/use-daily-earnings';
import { useDaySales } from '../../hooks/use-day-sales';
import { CategoryStrip } from './parts/CategoryStrip';
import { SaleCard } from './parts/SaleCard';
import { SalesFilters } from './parts/SalesFilters';

interface TotalsEntry {
  label: string;
  value: number;
}

function reportTotals(
  report: TDailyEarningsReport,
  type: TReportType | null,
): readonly TotalsEntry[] {
  if (type === 'Local') {
    return [{ label: TYPE_LABELS.Local, value: report.localTotal }];
  }
  if (type === 'Delivery') {
    return [{ label: TYPE_LABELS.Delivery, value: report.deliveryTotal }];
  }
  return [
    { label: 'Total do dia', value: report.grandTotal },
    { label: TYPE_LABELS.Local, value: report.localTotal },
    { label: TYPE_LABELS.Delivery, value: report.deliveryTotal },
  ];
}

export function DailyEarningsPage(): React.ReactNode {
  const [filters, setFilters] = useState<TDaySalesFilters>(NO_SALES_FILTERS);
  // The type chip doubles as the earnings report selector: the totals always
  // reflect the order-type scope, while payment and category chips narrow
  // only the sales list below.
  const earningsQuery = useDailyEarnings(filters.type ?? undefined);
  const salesQuery = useDaySales();
  const { menuQuery } = useCatalog();

  const setType = (type: TReportType | null): void =>
    setFilters((current) => ({ ...current, type }));
  const setPayment = (payment: string | null): void =>
    setFilters((current) => ({ ...current, payment }));
  const setCategory = (category: string | null): void =>
    setFilters((current) => ({ ...current, category }));

  const renderBody = (): React.ReactNode => {
    if (
      earningsQuery.isPending ||
      salesQuery.isPending ||
      menuQuery.isPending
    ) {
      return <p className="text-stone-600">Carregando…</p>;
    }
    if (!earningsQuery.data || !salesQuery.data || !menuQuery.data) {
      return (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {toErrorMessage(
            earningsQuery.error ?? salesQuery.error ?? menuQuery.error,
          )}
          <div className="mt-2">
            <Button
              className="px-3 py-1.5 text-sm"
              onClick={() => {
                void earningsQuery.refetch();
                void salesQuery.refetch();
                void menuQuery.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    const sales = sortSalesNewestFirst(
      filterDaySales(enrichDaySales(salesQuery.data, menuQuery.data), filters),
    );
    return (
      <>
        <div
          className={filters.type ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-3'}
        >
          {reportTotals(earningsQuery.data, filters.type).map((entry) => (
            <div key={entry.label} className="card">
              <p className="text-sm text-stone-600">{entry.label}</p>
              <p className="mt-1 text-3xl font-bold text-stone-900">
                {formatBRL(entry.value)}
              </p>
            </div>
          ))}
        </div>
        <SalesFilters
          filters={filters}
          onTypeChange={setType}
          onPaymentChange={setPayment}
          onCategoryChange={setCategory}
        />
        <h2 className="text-xl font-bold text-stone-900">Vendas do Dia</h2>
        {sales.length === 0 ? (
          <p className="text-stone-600">Nenhuma venda…</p>
        ) : (
          <>
            <CategoryStrip quantities={categoryQuantities(sales)} />
            {sales.map((sale) => (
              <SaleCard key={sale.id} sale={sale} />
            ))}
          </>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <BackLink to="/manager" label="Painel do gerente" />
      <h1 className="text-2xl font-bold text-stone-900">
        Relatório de Ganhos Diários
      </h1>
      {renderBody()}
    </div>
  );
}
