import { useQuery } from '@tanstack/react-query';
import { MENU_QUERY_KEY, listMenu } from '@api/catalog.api';

// No interval, for the reason use-orders spells out: the manager's screens do
// not poll. An item that ran out of stock mid-service reaches the overview on
// the next Atualizar or window focus — and the manager is the one who took it
// off the menu, so her own mutation invalidates this key anyway.
export function useMenu() {
  return useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: listMenu,
    refetchOnWindowFocus: true,
  });
}
