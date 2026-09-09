import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY, type IAddItemPayload } from '@api/orders.api';
import { addItemToOrder } from '../api/orders.api';

export interface IAddItemInput {
  orderId: string;
  payload: IAddItemPayload;
}

export function useAddItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: IAddItemInput) =>
      addItemToOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
