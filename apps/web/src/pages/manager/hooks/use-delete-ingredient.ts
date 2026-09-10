import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INGREDIENTS_QUERY_KEY, deleteIngredient } from '@api/catalog.api';

export function useDeleteIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientId: string) => deleteIngredient(ingredientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INGREDIENTS_QUERY_KEY });
    },
  });
}
