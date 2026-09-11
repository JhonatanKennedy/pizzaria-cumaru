import type { TFlavorPart } from '@api/orders.api';

// Pizza sizes and their canvas (fatias), mirroring the backend's size
// registry: the flat catalog registers each pizza per size and the name
// carries the trailing size token ("Mussarela G", "Mussarela M").
export const PIZZA_SIZES = ['M', 'G'] as const;
export type TPizzaSize = (typeof PIZZA_SIZES)[number];

export const PIZZA_SIZE_CANVAS: Record<TPizzaSize, number> = {
  M: 6,
  G: 8,
};

export function pizzaSizeOf(name: string): TPizzaSize | null {
  for (const size of PIZZA_SIZES) {
    if (name.endsWith(` ${size}`)) {
      return size;
    }
  }
  return null;
}

export function canvasFor(name: string): number | null {
  const size = pizzaSizeOf(name);
  return size === null ? null : PIZZA_SIZE_CANVAS[size];
}

export function sumParts(parts: readonly TFlavorPart[]): number {
  return parts.reduce((total, part) => total + part.pieces, 0);
}

// The base flavor keeps the canvas minus the fatias given to other flavors.
export function canvasRemainder(
  canvas: number,
  parts: readonly TFlavorPart[],
): number {
  return canvas - sumParts(parts);
}

export function pizzaBaseName(name: string): string {
  const size = pizzaSizeOf(name);
  return size === null ? name : name.slice(0, -(size.length + 1));
}

// The writing half of the size convention: the manager's item form holds the
// base name and the size apart, and this is what turns them back into the
// single token-bearing name the catalog and the order contract expect.
export function itemNameWithSize(
  baseName: string,
  size: TPizzaSize | null,
): string {
  return size === null ? baseName : `${baseName} ${size}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Shares that read naturally as fractions; anything else renders as fatias.
const CLEAN_SHARES = new Set(['1/2', '1/3', '2/3', '1/4', '3/4']);
const PART_SEPARATOR = ' · ';

// "Mussarela G 4/8 · Chocolate G 2/8" renders as "Mussarela 1/2 · Chocolate
// 1/4" (whole-canvas parts as the bare name, clean shares as fractions, the
// rest as fatias) — pt-BR, for order lines and kitchen tiles.
export function formatComposition(parts: readonly TFlavorPart[]): string {
  const canvas = sumParts(parts);
  if (canvas === 0) {
    return '';
  }
  return parts
    .map((part) => {
      const label = pizzaBaseName(part.name);
      if (part.pieces === canvas) {
        return label;
      }
      const divisor = gcd(part.pieces, canvas);
      const share = `${part.pieces / divisor}/${canvas / divisor}`;
      if (CLEAN_SHARES.has(share)) {
        return `${label} ${share}`;
      }
      const fatiaWord = part.pieces === 1 ? 'fatia' : 'fatias';
      return `${label} ${part.pieces} ${fatiaWord}`;
    })
    .join(PART_SEPARATOR);
}
