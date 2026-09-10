// Pizza sizes are flat catalog entries whose names carry a trailing size
// token ("Mussarela G" / "Mussarela M"); the token fixes the fatia canvas
// that a composed pizza of that item must cover.
export const PIZZA_SIZES = ['M', 'G'] as const;
export type TPizzaSize = (typeof PIZZA_SIZES)[number];

export const PIZZA_SIZE_CANVAS: Readonly<Record<TPizzaSize, number>> = {
  G: 8,
  M: 6,
};

export function pizzaSizeOf(itemName: string): TPizzaSize | null {
  for (const size of PIZZA_SIZES) {
    if (itemName.endsWith(` ${size}`)) {
      return size;
    }
  }
  return null;
}

export function sizeCanvasOf(itemName: string): number | null {
  const size = pizzaSizeOf(itemName);
  return size === null ? null : PIZZA_SIZE_CANVAS[size];
}
