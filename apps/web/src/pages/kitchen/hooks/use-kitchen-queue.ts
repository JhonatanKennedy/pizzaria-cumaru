import { useQuery } from '@tanstack/react-query';
import { KITCHEN_QUEUE_KEY, listKitchenQueue } from '../api/kitchen.api';

const REFRESH_INTERVAL_MS = 15 * 1000;

export function useKitchenQueue() {
  return useQuery({
    queryKey: KITCHEN_QUEUE_KEY,
    queryFn: listKitchenQueue,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
