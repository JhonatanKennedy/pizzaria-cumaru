import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@api/orders.api';
import { updateOrderItemQuantity } from '../api/orders.api';

export interface IUpdateItemQuantityInput {
  orderId: string;
  orderItemId: string;
  quantity: number;
}

export function useUpdateItemQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      orderItemId,
      quantity,
    }: IUpdateItemQuantityInput) =>
      updateOrderItemQuantity(orderId, orderItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
