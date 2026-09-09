import { useMutation, useQueryClient } from '@tanstack/react-query';
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
