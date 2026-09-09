import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MENU_QUERY_KEY, updateItemPrice } from '@api/catalog.api';

export interface IUpdateItemPriceInput {
  itemId: string;
  price: number;
}

export function useUpdateItemPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, price }: IUpdateItemPriceInput) =>
      updateItemPrice(itemId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
