import { useQuery } from '@tanstack/react-query';
import {
  INGREDIENTS_QUERY_KEY,
  MENU_QUERY_KEY,
  listIngredients,
  listMenu,
} from '@api/catalog.api';

export function useCatalog() {
  const menuQuery = useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: listMenu,
    refetchOnWindowFocus: true,
  });

  const ingredientsQuery = useQuery({
    queryKey: INGREDIENTS_QUERY_KEY,
    queryFn: listIngredients,
    refetchOnWindowFocus: true,
  });

  return { menuQuery, ingredientsQuery };
}
