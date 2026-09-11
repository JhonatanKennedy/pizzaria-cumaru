import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import type { TTableListing, TTableListingEntry } from '@api/tables.api';
import { formatElapsed, formatQuantity } from '@lib/format';
import { isInKitchen } from '@lib/kitchen-item';
import { orderStatusLabel } from '@lib/order-labels';
import { enrichOrder } from '@lib/order-enrich';
import { nextDeliveryStatus } from './delivery-status';
import { tableLabel } from './labels';
import { serviceStatus, type IServiceSources } from './service-status';

// The one record in an area worth naming: what it is, how long it has been
// going, and where it lives. `to` is null for a record with no screen of its
// own — a kitchen order only exists on the panel — so the look is text there.
export interface IOverviewLook {
  to: string | null;
  text: string;
}

// One line of the overview: a part of the service, what it is doing, and the
// one thing in it that has been waiting longest.
export interface IOverviewLine {
  label: string;
  // The area's screen. The line is a summary of a screen, and its name is how
  // the manager stops summarising it.
  to: string;
  // What the area is doing right now, already phrased. Null while its read is
  // out — the line still renders its name, never an error and never a zero.
  state: string | null;
  // The record that has been waiting longest, or null when the area has nothing
  // waiting. Deliberately one and not a list: a board showing the first four of
  // everything fills up as the shift goes on and is arbitrary even when it fits,
  // which is what the door beside it is for.
  look: IOverviewLook | null;
}

export interface IServiceOverview {
  floor: IOverviewLine;
  kitchen: IOverviewLine;
  deliveries: IOverviewLine;
  menu: IOverviewLine;
}

const KITCHEN_ITEM_NAMES = 2;

// An unreadable timestamp sorts first rather than poisoning the comparator:
// sorting by NaN leaves the order undefined, and the record whose age we cannot
// read is the one worth looking at anyway.
function timeOf(order: TOrderListing | undefined): number {
  if (order === undefined) {
    return 0;
  }
  const time = new Date(order.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function oldestFirst(orders: readonly TOrderListing[]): TOrderListing[] {
  return [...orders].sort((a, b) => timeOf(a) - timeOf(b));
}

// A label with how long it has been going, when the order that carries the time
// is in the listing. `verb` is what the age is the age *of* — "Mesa 3 · aberta
// há 40 min" reads as an answer where "Mesa 3 · há 40 min" reads as a riddle.
// Without the order the label stands alone rather than guessing an age.
function withAge(
  label: string,
  verb: string | null,
  order: TOrderListing | undefined,
  now: Date,
): string {
  if (order === undefined) {
    return label;
  }
  const age = formatElapsed(new Date(order.createdAt), now);
  if (age === '') {
    return label;
  }
  return verb === null ? `${label} · ${age}` : `${label} · ${verb} ${age}`;
}

// A delivery order may be created without a customer name, and an empty label
// would leave the line unnameable.
function deliveryLabel(order: TOrderListing): string {
  const name = order.customerName ?? '';
  return name.length > 0 ? name : 'Entrega';
}

// The listing carries a tableId, never a number, so a local order is named by
// looking its table up. When the floor has not landed the line says "Pedido"
// rather than guessing at a delivery.
function orderLabel(
  order: TOrderListing,
  tablesById: ReadonlyMap<string, TTableListingEntry>,
): string {
  if (order.tableId !== undefined) {
    const table = tablesById.get(order.tableId);
    if (table !== undefined) {
      return tableLabel(table);
    }
  }
  if (order.type === 'Delivery') {
    return deliveryLabel(order);
  }
  return 'Pedido';
}

function kitchenItemNames(order: TOrderListing, menu: TMenuListing): string {
  const inKitchen = enrichOrder(order, menu).items.filter((item) =>
    isInKitchen(item.status),
  );
  const named = inKitchen
    .slice(0, KITCHEN_ITEM_NAMES)
    .map((item) => `${item.quantity}× ${item.name}`);
  const hidden = inKitchen.length - named.length;
  if (hidden === 0) {
    return named.join(', ');
  }
  return `${named.join(', ')} e mais ${formatQuantity(hidden, 'item', 'itens')}`;
}

// The table that has been open longest. An order is opened with its table and
// closed with it, so the order's age is the table's age — and the table sitting
// longest is the one the manager would go and ask the waiter about.
function floorLook(
  tables: TTableListing | undefined,
  orders: TOrderListing[] | undefined,
  now: Date,
): IOverviewLook | null {
  if (tables === undefined) {
    return null;
  }
  const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
  const occupied = tables.flatMap((table) => {
    const openOrder = table.openOrder;
    // A free table is not part of the service; it is not a candidate.
    if (openOrder === null) {
      return [];
    }
    return [
      {
        orderId: openOrder.orderId,
        label: tableLabel(table),
        order: orderById.get(openOrder.orderId),
      },
    ];
  });
  occupied.sort((a, b) => timeOf(a.order) - timeOf(b.order));
  const [oldest] = occupied;
  if (oldest === undefined) {
    return null;
  }
  return {
    to: `/waiter/orders/${oldest.orderId}`,
    text: withAge(oldest.label, 'aberta', oldest.order, now),
  };
}

// The order the kitchen has been owing longest, with no age of its own: an
// order item carries no timestamp in the listing, so the order's clock would be
// read as kitchen wait and would be wrong every time the waiter added a pizza to
// an order opened an hour ago. Oldest first is the order the cooks work in,
// which is the same statement without the false precision.
function kitchenLook(
  orders: TOrderListing[] | undefined,
  menu: TMenuListing | undefined,
  tablesById: ReadonlyMap<string, TTableListingEntry>,
): IOverviewLook | null {
  if (orders === undefined) {
    return null;
  }
  const oldest = oldestFirst(orders).find((order) =>
    order.items.some((item) => isInKitchen(item.status)),
  );
  if (oldest === undefined) {
    return null;
  }
  const label = orderLabel(oldest, tablesById);
  const names = menu === undefined ? '' : kitchenItemNames(oldest, menu);
  return { to: null, text: names === '' ? label : `${label} · ${names}` };
}

// The delivery furthest along the clock — the one most likely to arrive late.
// Its status is part of the name because "saiu há 20 min" and "ainda não saiu
// há 20 min" are different problems with different fixes.
function deliveriesLook(
  orders: TOrderListing[] | undefined,
  now: Date,
): IOverviewLook | null {
  if (orders === undefined) {
    return null;
  }
  const oldest = oldestFirst(orders).find(
    (order) =>
      order.type === 'Delivery' && nextDeliveryStatus(order.status) !== null,
  );
  if (oldest === undefined) {
    return null;
  }
  return {
    to: `/manager/delivery/${oldest.id}`,
    text: withAge(
      `${deliveryLabel(oldest)} · ${orderStatusLabel(oldest.status)}`,
      null,
      oldest,
      now,
    ),
  };
}

// `now` is read by the caller and handed to every line, so the whole overview is
// derived from a single instant rather than four clocks a millisecond apart.
export function serviceOverview(
  { tables, orders, menu }: IServiceSources,
  now: Date,
): IServiceOverview {
  const status = serviceStatus({ tables, orders, menu });
  const tablesById = new Map((tables ?? []).map((table) => [table.id, table]));

  return {
    floor: {
      label: 'Salão',
      to: '/waiter/tables',
      state: status.floor,
      look: floorLook(tables, orders, now),
    },
    kitchen: {
      label: 'Cozinha',
      to: '/kitchen',
      state: status.kitchen,
      look: kitchenLook(orders, menu, tablesById),
    },
    deliveries: {
      label: 'Entregas',
      to: '/manager/delivery',
      state: status.deliveries,
      look: deliveriesLook(orders, now),
    },
    // Nothing in the catalog waits: an item is unavailable until somebody makes
    // it available again, and there is no clock to take a maximum of. Its count
    // and its door are the whole line, and the fix happens on the screen the
    // name leads to — so naming one of five would save a click of curiosity and
    // none of work.
    menu: {
      label: 'Cardápio',
      to: '/manager/menu',
      state: status.menu,
      look: null,
    },
  };
}
