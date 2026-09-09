import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TABLES_QUERY_KEY } from '@api/tables.api';
import type { TPaymentType } from '@lib/payment-labels';
import { closeOrder } from '../api/orders.api';

export interface ICloseOrderInput {
  orderId: string;
  paymentType: TPaymentType;
}

export function useCloseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentType }: ICloseOrderInput) =>
      closeOrder(orderId, paymentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });
}
