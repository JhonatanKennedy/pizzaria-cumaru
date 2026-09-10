import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@api/orders.api';
import type { TDeliveryStatus } from '../business/delivery-status';
import { updateDeliveryOrderStatus } from '../api/delivery-orders.api';

export interface IAdvanceDeliveryStatusInput {
  orderId: string;
  status: TDeliveryStatus;
}

export function useAdvanceDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: IAdvanceDeliveryStatusInput) =>
      updateDeliveryOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
