import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MENU_QUERY_KEY, deleteItem } from '@api/catalog.api';

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
