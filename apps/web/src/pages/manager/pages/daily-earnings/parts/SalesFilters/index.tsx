import { CATEGORY_ORDER, categoryLabel } from '@lib/catalog';
import { PAYMENT_TYPES, paymentLabel } from '@lib/payment-labels';
import { Chip } from '@components/Chip';
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

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  optionLabel,
  onChange,
}: ChipGroupProps<T>): React.ReactNode {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      <Chip selected={selected === null} onClick={() => onChange(null)}>
        Todos
      </Chip>
      {options.map((option) => (
        <Chip
          key={option}
          selected={selected === option}
          onClick={() => onChange(option)}
        >
          {optionLabel(option)}
        </Chip>
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
