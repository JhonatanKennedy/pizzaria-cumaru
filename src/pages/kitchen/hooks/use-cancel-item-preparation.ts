import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KITCHEN_QUEUE_KEY, cancelItemPreparation } from '../api/kitchen.api';

export interface ICancelItemPreparationInput {
  orderId: string;
  orderItemId: string;
  reason: string;
}

export function useCancelItemPreparation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      orderItemId,
      reason,
    }: ICancelItemPreparationInput) =>
      cancelItemPreparation(orderId, orderItemId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KITCHEN_QUEUE_KEY });
    },
  });
}
