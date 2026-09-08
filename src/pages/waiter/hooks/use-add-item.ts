import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addItemToOrder } from '../api/orders.api';
import type { IAddItemPayload } from '../api/orders.api';

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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
