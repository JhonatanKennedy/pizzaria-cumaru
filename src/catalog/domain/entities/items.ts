import { EItemCategory } from '../enums/item-category.js';

export type TCreateItemParams = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: EItemCategory;
  requiresPreparation: boolean;
  ingredientIds?: string[];
};

export class Item {
  private constructor(
    private readonly id: string,
    private name: string,
    private description: string,
    private price: number,
    private readonly category: EItemCategory,
    private requiresPreparation: boolean,
    private ingredientIds: string[],
  ) {}

  static create(params: TCreateItemParams): Item {
    if (!params.name.trim()) {
      throw new Error('Name is required');
    }

    if (params.price < 0) {
      throw new Error('Price cannot be negative');
    }

    return new Item(
      params.id,
      params.name,
      params.description,
      params.price,
      params.category,
      params.requiresPreparation,
      params.ingredientIds ?? [],
    );
  }

  changePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    this.price = newPrice;
  }

  rename(name: string): void {
    if (!name.trim()) {
      throw new Error('Name is required');
    }
    this.name = name;
  }

  changeDescription(description: string): void {
    this.description = description;
  }

  changeRequiresPreparation(requiresPreparation: boolean): void {
    this.requiresPreparation = requiresPreparation;
  }

  // The update contract replaces the ingredient links wholesale; the caller
  // validates that every id names a real ingredient.
  replaceIngredients(ingredientIds: string[]): void {
    this.ingredientIds = [...ingredientIds];
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPrice(): number {
    return this.price;
  }

  getCategory(): EItemCategory {
    return this.category;
  }

  getRequiresPreparation(): boolean {
    return this.requiresPreparation;
  }

  getIngredientIds(): ReadonlyArray<string> {
    return this.ingredientIds;
  }
}
