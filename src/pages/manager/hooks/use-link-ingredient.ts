import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MENU_QUERY_KEY, linkIngredientToItem } from '@api/catalog.api';

export interface ILinkIngredientInput {
  itemId: string;
  ingredientId: string;
}

export function useLinkIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, ingredientId }: ILinkIngredientInput) =>
      linkIngredientToItem(itemId, ingredientId),
    // Linking flips the item's derived availability; the ingredient list
    // itself never changes, so only the menu cache needs a refresh.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
