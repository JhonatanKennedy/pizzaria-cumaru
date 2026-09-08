import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTableOrder } from '../api/orders.api';

export interface ICreateTableOrderInput {
  userId: number;
  tableId: string;
}

export function useCreateTableOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, tableId }: ICreateTableOrderInput) =>
      createTableOrder(userId, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
