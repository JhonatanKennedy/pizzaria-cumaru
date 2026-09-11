import { useQuery } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY, listOrders } from '@api/orders.api';

// No interval: nothing in the manager context polls. Every manager screen
// refreshes on window focus, on the mutations it fires itself, and — where the
// manager is watching rather than working — on an explicit Atualizar. A poll is
// a request every 15 seconds for as long as the tab is open, and the screens
// that read this one are open all shift.
export function useOrders() {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: listOrders,
    refetchOnWindowFocus: true,
  });
}
