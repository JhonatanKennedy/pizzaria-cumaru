import { useQuery } from '@tanstack/react-query';
import { TABLES_QUERY_KEY, listTables } from '@api/tables.api';

// No interval, for the reason use-orders spells out: the manager's screens do
// not poll. The overview reads the floor beside the orders it is showing, and
// both arrive on the same Atualizar.
export function useTables() {
  return useQuery({
    queryKey: TABLES_QUERY_KEY,
    queryFn: listTables,
    refetchOnWindowFocus: true,
  });
}
