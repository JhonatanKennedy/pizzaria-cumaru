import { useMutation, useQueryClient } from '@tanstack/react-query';
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
