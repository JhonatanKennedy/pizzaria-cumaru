import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TABLES_QUERY_KEY, createTable } from '@api/tables.api';

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (number: number) => createTable(number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });
}
