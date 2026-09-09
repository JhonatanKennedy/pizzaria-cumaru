import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INGREDIENTS_QUERY_KEY, renameIngredient } from '@api/catalog.api';

export interface IRenameIngredientInput {
  ingredientId: string;
  name: string;
}

export function useRenameIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ingredientId, name }: IRenameIngredientInput) =>
      renameIngredient(ingredientId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INGREDIENTS_QUERY_KEY });
    },
  });
}
