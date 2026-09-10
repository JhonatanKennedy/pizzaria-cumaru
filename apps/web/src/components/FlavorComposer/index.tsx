import { useState } from 'react';
import type { TMenuItem } from '@api/catalog.api';
import type { TFlavorPart } from '@api/orders.api';
import { canvasFor, pizzaBaseName, pizzaSizeOf } from '@lib/flavor-composition';

interface Allocation {
  item: TMenuItem;
  pieces: number;
}

interface FlavorComposerProps {
  base: TMenuItem;
  items: TMenuItem[];
  onChange: (parts: TFlavorPart[]) => void;
}

function fatiasWord(count: number): string {
  return count === 1 ? 'fatia' : 'fatias';
}

export function FlavorComposer({
  base,
  items,
  onChange,
}: FlavorComposerProps): React.ReactNode {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const canvas = canvasFor(base.name);

  if (canvas === null) {
    return null;
  }

  // Same-size available pizzas are the flavor pool; the base is excluded
  // because it owns whatever fatias the flavors do not take.
  const flavorOptions = items.filter(
    (item) =>
      item.id !== base.id &&
      item.category === 'PIZZA' &&
      item.available &&
      canvasFor(item.name) === canvas,
  );

  const givenPieces = allocations.reduce(
    (total, allocation) => total + allocation.pieces,
    0,
  );
  const remaining = canvas - givenPieces;
  const allocatedIds = new Set(allocations.map((a) => a.item.id));
  const size = pizzaSizeOf(base.name);

  const emitParts = (next: Allocation[]): void => {
    if (next.length === 0) {
      // Taking every flavor back makes this a plain whole-pizza add again,
      // so the payload carries no parts — the panel omits the field.
      onChange([]);
      return;
    }
    const given = next.reduce(
      (total, allocation) => total + allocation.pieces,
      0,
    );
    const basePieces = canvas - given;
    const basePart =
      basePieces > 0 ? [{ name: base.name, pieces: basePieces }] : [];
    onChange([
      ...basePart,
      ...next.map((allocation) => ({
        name: allocation.item.name,
        pieces: allocation.pieces,
      })),
    ]);
  };

  const addFlavor = (item: TMenuItem): void => {
    if (remaining === 0) {
      return;
    }
    const next = [...allocations, { item, pieces: 1 }];
    setAllocations(next);
    emitParts(next);
  };

  const decreaseFlavor = (item: TMenuItem): void => {
    const current = allocations.find((a) => a.item.id === item.id);
    if (!current) {
      return;
    }
    // Taking the last fatia back removes the flavor from the composition.
    const next =
      current.pieces === 1
        ? allocations.filter((a) => a.item.id !== item.id)
        : allocations.map((a) =>
            a.item.id === item.id ? { item, pieces: a.pieces - 1 } : a,
          );
    setAllocations(next);
    emitParts(next);
  };

  const increaseFlavor = (item: TMenuItem): void => {
    if (remaining === 0) {
      return;
    }
    const next = allocations.map((a) =>
      a.item.id === item.id ? { item, pieces: a.pieces + 1 } : a,
    );
    setAllocations(next);
    emitParts(next);
  };

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-sm font-semibold text-stone-900">Sabores</p>
      <p className="mt-1 text-sm text-stone-600">
        {pizzaBaseName(base.name)} (base) fica com {remaining}{' '}
        {fatiasWord(remaining)}
        {size !== null && ` — pizza ${size} de ${canvas} fatias`}
      </p>
      {allocations.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {allocations.map((allocation) => (
            <li
              key={allocation.item.id}
              className="flex items-center justify-between rounded-md bg-white px-2 py-1"
            >
              <span className="text-sm text-stone-800">
                {pizzaBaseName(allocation.item.name)} — {allocation.pieces}{' '}
                {fatiasWord(allocation.pieces)}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Diminuir ${allocation.item.name}`}
                  onClick={() => decreaseFlavor(allocation.item)}
                  className="rounded-md bg-stone-200 px-2 py-0.5 text-sm font-semibold text-stone-800 hover:bg-stone-300"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={`Aumentar ${allocation.item.name}`}
                  onClick={() => increaseFlavor(allocation.item)}
                  className="rounded-md bg-stone-200 px-2 py-0.5 text-sm font-semibold text-stone-800 hover:bg-stone-300"
                >
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {flavorOptions
          .filter((item) => !allocatedIds.has(item.id))
          .map((item) => (
            <button
              type="button"
              key={item.id}
              disabled={remaining === 0}
              onClick={() => addFlavor(item)}
              className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-700 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pizzaBaseName(item.name)}
            </button>
          ))}
      </div>
    </div>
  );
}
