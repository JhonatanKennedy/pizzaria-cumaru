import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@api/orders.api';
import { TABLES_QUERY_KEY } from '@api/tables.api';
import { cancelOrder } from '../api/orders.api';

export interface ICancelOrderInput {
  orderId: string;
  reason: string;
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: ICancelOrderInput) =>
      cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });
}
