import { useQuery } from '@tanstack/react-query';
import { DAY_SALES_QUERY_KEY, getDaySales } from '../api/daily-sales.api';

export function useDaySales() {
  return useQuery({
    queryKey: DAY_SALES_QUERY_KEY,
    queryFn: getDaySales,
  });
}
