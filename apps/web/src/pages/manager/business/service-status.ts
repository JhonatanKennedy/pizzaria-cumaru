import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import type { TTableListing } from '@api/tables.api';
import { formatQuantity } from '@lib/format';
import { isInKitchen } from '@lib/kitchen-item';
import { nextDeliveryStatus } from './delivery-status';

// What each group of the overview is doing right now, already phrased for the
// heading that carries it. A null field is a read that has not landed — a group
// without its line still renders its heading and its rows, never an error.
export interface IServiceStatus {
  floor: string | null;
  kitchen: string | null;
  menu: string | null;
  deliveries: string | null;
}

// The three reads the overview needs, each optional so a group renders while its
// own query is still in flight and the others have already arrived.
export interface IServiceSources {
  tables: TTableListing | undefined;
  orders: TOrderListing[] | undefined;
  menu: TMenuListing | undefined;
}

// The count of tables and the noun after it agree on the floor's size, not on
// the occupied count: "1 de 12 mesas ocupadas" is right where "1 de 12 mesa
// ocupada" is not.
function tablesSummary(tables: TTableListing): string {
  const occupied = tables.filter((table) => table.openOrder !== null).length;
  if (occupied === 0) {
    return 'Nenhuma mesa ocupada';
  }
  const floor = formatQuantity(tables.length, 'mesa ocupada', 'mesas ocupadas');
  return `${occupied} de ${floor}`;
}

function kitchenSummary(orders: TOrderListing[]): string {
  const inKitchen = orders
    .flatMap((order) => order.items)
    .filter((item) => isInKitchen(item.status)).length;
  if (inKitchen === 0) {
    return 'Nada na cozinha';
  }
  return formatQuantity(inKitchen, 'item na cozinha', 'itens na cozinha');
}

// The listing already folds a lack of stock into the item's own availability,
// so one count covers both an item pulled from the menu and one whose
// ingredient ran out.
function menuSummary(menu: TMenuListing): string {
  const unavailable = menu.filter((item) => !item.available).length;
  if (unavailable === 0) {
    return 'Cardápio completo';
  }
  return formatQuantity(
    unavailable,
    'item indisponível',
    'itens indisponíveis',
  );
}

// An order with a next step is one still on its way; Delivered has none, and
// neither does a cancelled order — so neither is in flight.
function deliverySummary(orders: TOrderListing[]): string {
  const inFlight = orders.filter(
    (order) =>
      order.type === 'Delivery' && nextDeliveryStatus(order.status) !== null,
  ).length;
  if (inFlight === 0) {
    return 'Nenhuma entrega em andamento';
  }
  return formatQuantity(
    inFlight,
    'entrega em andamento',
    'entregas em andamento',
  );
}

export function serviceStatus({
  tables,
  orders,
  menu,
}: IServiceSources): IServiceStatus {
  return {
    floor: tables === undefined ? null : tablesSummary(tables),
    kitchen: orders === undefined ? null : kitchenSummary(orders),
    menu: menu === undefined ? null : menuSummary(menu),
    deliveries: orders === undefined ? null : deliverySummary(orders),
  };
}
