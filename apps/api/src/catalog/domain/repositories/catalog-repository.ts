import type { Item } from '../entities/items.js';
import type { Ingredient } from '../entities/ingredients.js';

export interface ICatalogRepository {
  findAllItems(): Promise<Item[]>;
  findAllIngredients(): Promise<Ingredient[]>;
  findItemById(id: string): Promise<Item | null>;
  findItemByName(name: string): Promise<Item | null>;
  findIngredientById(id: string): Promise<Ingredient | null>;
  findIngredientByName(name: string): Promise<Ingredient | null>;
  saveItem(item: Item): Promise<void>;
  saveIngredient(ingredient: Ingredient): Promise<void>;
  deleteItem(id: string): Promise<void>;
  deleteIngredient(id: string): Promise<void>;
}

export const CATALOG_REPOSITORY = Symbol('ICatalogRepository');
