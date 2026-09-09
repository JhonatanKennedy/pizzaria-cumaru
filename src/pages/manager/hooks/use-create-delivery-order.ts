import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@api/orders.api';
import {
  createDeliveryOrder,
  type ICreateDeliveryOrderPayload,
} from '../api/delivery-orders.api';

export function useCreateDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateDeliveryOrderPayload) =>
      createDeliveryOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
