import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TABLES_QUERY_KEY, deleteTable } from '@api/tables.api';

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tableId: string) => deleteTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });
}
