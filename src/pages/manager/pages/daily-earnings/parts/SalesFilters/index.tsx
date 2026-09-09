import { CATEGORY_ORDER, categoryLabel } from '@lib/catalog';
import { PAYMENT_TYPES, paymentLabel } from '@lib/payment-labels';
import { orderTypeLabel } from '@pages/manager/business/labels';
import { REPORT_TYPES, type TReportType } from '@pages/manager/api/reports.api';
import type { TDaySalesFilters } from '@pages/manager/business/filter-sales';

export interface SalesFiltersProps {
  filters: TDaySalesFilters;
  onTypeChange(type: TReportType | null): void;
  onPaymentChange(payment: string | null): void;
  onCategoryChange(category: string | null): void;
}

interface ChipGroupProps<T> {
  label: string;
  options: readonly T[];
  selected: T | null;
  optionLabel(value: T): string;
  onChange(value: T | null): void;
}

function chipClass(active: boolean): string {
  return active
    ? 'rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
    : 'rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700';
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  optionLabel,
  onChange,
}: ChipGroupProps<T>): React.ReactNode {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      <button
        type="button"
        className={chipClass(selected === null)}
        aria-pressed={selected === null}
        onClick={() => onChange(null)}
      >
        Todos
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={chipClass(selected === option)}
          aria-pressed={selected === option}
          onClick={() => onChange(option)}
        >
          {optionLabel(option)}
        </button>
      ))}
    </div>
  );
}

export function SalesFilters({
  filters,
  onTypeChange,
  onPaymentChange,
  onCategoryChange,
}: SalesFiltersProps): React.ReactNode {
  return (
    <div className="space-y-2">
      <ChipGroup
        label="Tipo de venda"
        options={REPORT_TYPES}
        selected={filters.type}
        optionLabel={orderTypeLabel}
        onChange={onTypeChange}
      />
      <ChipGroup
        label="Forma de pagamento"
        options={PAYMENT_TYPES}
        selected={filters.payment}
        optionLabel={paymentLabel}
        onChange={onPaymentChange}
      />
      <ChipGroup
        label="Categoria"
        options={CATEGORY_ORDER}
        selected={filters.category}
        optionLabel={categoryLabel}
        onChange={onCategoryChange}
      />
    </div>
  );
}
