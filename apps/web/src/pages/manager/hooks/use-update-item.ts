import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MENU_QUERY_KEY,
  updateItem,
  type IUpdateItemPayload,
} from '@api/catalog.api';

export interface IUpdateItemInput {
  itemId: string;
  payload: IUpdateItemPayload;
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, payload }: IUpdateItemInput) =>
      updateItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
