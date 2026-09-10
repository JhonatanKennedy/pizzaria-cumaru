import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KITCHEN_QUEUE_KEY, startItemPreparation } from '../api/kitchen.api';

export interface IStartPreparationInput {
  orderId: string;
  orderItemId: string;
}

export function useStartPreparation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, orderItemId }: IStartPreparationInput) =>
      startItemPreparation(orderId, orderItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KITCHEN_QUEUE_KEY });
    },
  });
}
