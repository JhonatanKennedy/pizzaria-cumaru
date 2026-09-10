import { useQuery } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY, listOrders } from '@api/orders.api';

const REFRESH_INTERVAL_MS = 15 * 1000;

export function useOrders() {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: listOrders,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}
