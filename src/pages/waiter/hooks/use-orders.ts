import { useQuery } from '@tanstack/react-query';
import { listOrders } from '../api/orders.api';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: listOrders,
    refetchOnWindowFocus: true,
  });
}
