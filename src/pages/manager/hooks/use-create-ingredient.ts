import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INGREDIENTS_QUERY_KEY, createIngredient } from '@api/catalog.api';

export function useCreateIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createIngredient(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INGREDIENTS_QUERY_KEY });
    },
  });
}
