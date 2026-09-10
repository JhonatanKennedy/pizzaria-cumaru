import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  INGREDIENTS_QUERY_KEY,
  MENU_QUERY_KEY,
  updateIngredientStock,
} from '@api/catalog.api';

export interface IToggleIngredientStockInput {
  ingredientId: string;
  available: boolean;
}

export function useToggleIngredientStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ingredientId, available }: IToggleIngredientStockInput) =>
      updateIngredientStock(ingredientId, available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INGREDIENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });
}
