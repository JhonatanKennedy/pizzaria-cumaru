import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KITCHEN_QUEUE_KEY, cancelItemPreparation } from '../api/kitchen.api';

export interface ICancelItemPreparationInput {
  orderId: string;
  orderItemId: string;
}

export function useCancelItemPreparation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, orderItemId }: ICancelItemPreparationInput) =>
      cancelItemPreparation(orderId, orderItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KITCHEN_QUEUE_KEY });
    },
  });
}
