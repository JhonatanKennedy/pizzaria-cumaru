import { useQuery } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY, listOrders } from '@api/orders.api';

export function useOrders() {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: listOrders,
    refetchOnWindowFocus: true,
  });
}
