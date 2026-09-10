import { useQuery } from '@tanstack/react-query';
import { MENU_QUERY_KEY, listMenu } from '@api/catalog.api';

export function useMenu() {
  return useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: listMenu,
    refetchOnWindowFocus: true,
  });
}
