export type TCreateIngredientParams = {
  id: string;
  name: string;
  inStock: boolean;
};

export class Ingredient {
  private constructor(
    private readonly id: string,
    private name: string,
    private inStock: boolean,
  ) {}

  static create(params: TCreateIngredientParams): Ingredient {
    if (!params.name.trim()) {
      throw new Error('Name is required');
    }
    return new Ingredient(params.id, params.name, params.inStock);
  }

  rename(name: string): void {
    if (!name.trim()) {
      throw new Error('Name is required');
    }
    this.name = name;
  }

  markOutOfStock(): void {
    this.inStock = false;
  }

  markInStock(): void {
    this.inStock = true;
  }

  isAvailable(): boolean {
    return this.inStock;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }
}
