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
    private readonly requiresPreparation: boolean,
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

  linkIngredient(ingredientId: string): void {
    if (this.ingredientIds.includes(ingredientId)) {
      return;
    }
    this.ingredientIds.push(ingredientId);
  }

  unlinkIngredient(ingredientId: string): void {
    this.ingredientIds = this.ingredientIds.filter((id) => id !== ingredientId);
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
