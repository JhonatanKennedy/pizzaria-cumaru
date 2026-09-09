import { z } from 'zod';
import { apiRequest } from './http-client';

export const MENU_QUERY_KEY = ['menu'] as const;
export const INGREDIENTS_QUERY_KEY = ['ingredients'] as const;

export const menuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  requiresPreparation: z.boolean(),
  available: z.boolean(),
  ingredientIds: z.array(z.string()),
});

export type TMenuItem = z.infer<typeof menuItemSchema>;

export const menuListingSchema = z.array(menuItemSchema);

export type TMenuListing = z.infer<typeof menuListingSchema>;

export const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  available: z.boolean(),
});

export type TIngredient = z.infer<typeof ingredientSchema>;

export const ingredientListingSchema = z.array(ingredientSchema);

export type TIngredientListing = z.infer<typeof ingredientListingSchema>;

export interface ICreateItemPayload {
  name: string;
  description: string;
  price: number;
  category: string;
  requiresPreparation: boolean;
  ingredientIds: string[];
}

export interface IUpdateItemPayload {
  name?: string;
  description?: string;
}

export async function listMenu(): Promise<TMenuListing> {
  const data = await apiRequest('/items');
  return menuListingSchema.parse(data);
}

export async function listIngredients(): Promise<TIngredientListing> {
  const data = await apiRequest('/ingredients');
  return ingredientListingSchema.parse(data);
}

export async function createItem(payload: ICreateItemPayload): Promise<void> {
  await apiRequest('/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateItem(
  itemId: string,
  payload: IUpdateItemPayload,
): Promise<void> {
  await apiRequest(`/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateItemPrice(
  itemId: string,
  price: number,
): Promise<void> {
  await apiRequest(`/items/${itemId}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ price }),
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  await apiRequest(`/items/${itemId}`, { method: 'DELETE' });
}

export async function linkIngredientToItem(
  itemId: string,
  ingredientId: string,
): Promise<void> {
  await apiRequest(`/items/${itemId}/ingredients`, {
    method: 'POST',
    body: JSON.stringify({ ingredientId }),
  });
}

export async function unlinkIngredientFromItem(
  itemId: string,
  ingredientId: string,
): Promise<void> {
  await apiRequest(`/items/${itemId}/ingredients/${ingredientId}`, {
    method: 'DELETE',
  });
}

export async function createIngredient(name: string): Promise<void> {
  await apiRequest('/ingredients', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function renameIngredient(
  ingredientId: string,
  name: string,
): Promise<void> {
  await apiRequest(`/ingredients/${ingredientId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function updateIngredientStock(
  ingredientId: string,
  available: boolean,
): Promise<void> {
  await apiRequest(`/ingredients/${ingredientId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  });
}

export async function deleteIngredient(ingredientId: string): Promise<void> {
  await apiRequest(`/ingredients/${ingredientId}`, { method: 'DELETE' });
}
