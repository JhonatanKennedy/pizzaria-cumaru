import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MENU_QUERY_KEY, unlinkIngredientFromItem } from '@api/catalog.api';

export interface IUnlinkIngredientInput {
  itemId: string;
  ingredientId: string;
}

export function useUnlinkIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, ingredientId }: IUnlinkIngredientInput) =>
      unlinkIngredientFromItem(itemId, ingredientId),
    // Unlinking flips the item's derived availability; the ingredient list
    // itself never changes, so only the menu cache needs a refresh.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
