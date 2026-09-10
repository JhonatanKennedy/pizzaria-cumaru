import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KITCHEN_QUEUE_KEY, finishItemPreparation } from '../api/kitchen.api';

export interface IFinishPreparationInput {
  orderId: string;
  orderItemId: string;
}

export function useFinishPreparation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, orderItemId }: IFinishPreparationInput) =>
      finishItemPreparation(orderId, orderItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KITCHEN_QUEUE_KEY });
    },
  });
}
