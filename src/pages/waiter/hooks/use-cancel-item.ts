import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@api/orders.api';
import { cancelOrderItem } from '../api/orders.api';

export interface ICancelItemInput {
  orderId: string;
  orderItemId: string;
  reason: string;
}

export function useCancelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, orderItemId, reason }: ICancelItemInput) =>
      cancelOrderItem(orderId, orderItemId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
