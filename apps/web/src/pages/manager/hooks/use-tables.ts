import { useQuery } from '@tanstack/react-query';
import { TABLES_QUERY_KEY, listTables } from '@api/tables.api';

export function useTables() {
  return useQuery({
    queryKey: TABLES_QUERY_KEY,
    queryFn: listTables,
  });
}
