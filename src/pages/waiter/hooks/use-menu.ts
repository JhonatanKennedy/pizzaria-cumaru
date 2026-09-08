import { useQuery } from '@tanstack/react-query';
import { listMenu } from '../api/catalog.api';

export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: listMenu,
    refetchOnWindowFocus: true,
  });
}
