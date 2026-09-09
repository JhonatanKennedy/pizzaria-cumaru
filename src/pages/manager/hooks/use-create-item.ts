import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MENU_QUERY_KEY,
  createItem,
  type ICreateItemPayload,
} from '@api/catalog.api';

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateItemPayload) => createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
