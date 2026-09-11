import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@api/orders.api';
import { TABLES_QUERY_KEY } from '@api/tables.api';
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
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });
}
