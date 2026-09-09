import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TABLES_QUERY_KEY, renameTable } from '@api/tables.api';

export interface IRenameTableInput {
  tableId: string;
  number: number;
}

export function useRenameTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, number }: IRenameTableInput) =>
      renameTable(tableId, number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });
}
