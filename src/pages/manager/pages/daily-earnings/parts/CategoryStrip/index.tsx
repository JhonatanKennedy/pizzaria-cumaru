import { categoryLabel } from '@lib/catalog';
import type { TCategoryQuantity } from '@pages/manager/business/filter-sales';

export interface CategoryStripProps {
  quantities: TCategoryQuantity[];
}

export function CategoryStrip({
  quantities,
}: CategoryStripProps): React.ReactNode {
  const soldCategories = quantities.filter((entry) => entry.quantity > 0);

  if (soldCategories.length === 0) {
    return null;
  }

  return (
    <section aria-label="Quantidades vendidas por categoria">
      <h2 className="text-lg font-semibold text-stone-900">
        Quantidades vendidas por categoria
      </h2>
      <div className="flex flex-wrap gap-2">
        {soldCategories.map((entry) => (
          <span
            key={entry.category}
            className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-800"
          >
            {categoryLabel(entry.category)} · {entry.quantity}
          </span>
        ))}
      </div>
    </section>
  );
}
