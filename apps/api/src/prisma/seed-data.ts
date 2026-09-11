import { EItemCategory } from '../catalog/domain/enums/item-category.js';
import { PIZZA_SIZES } from '../catalog/domain/sizes.js';
import { EUserRole } from '../users/domain/enums/user-role.js';

// The reference dataset `seed.ts` writes, kept in its own module because
// nothing here reaches for Prisma, dotenv or bcrypt — which is what lets
// seed-data.spec.ts check it without a database.

export const SEED_PASSWORD = 'SenhaSegura123';

export interface SeedUser {
  login: string;
  name: string;
  // Typed as the domain enum rather than a string literal: `role` persists as
  // a plain String column and is only validated on the way back out by
  // `parseRole`, so a typo here would seed a user who cannot log in.
  role: EUserRole;
}

export const SEED_USERS: SeedUser[] = [
  { login: 'ana.gerente', name: 'Ana Gerente', role: EUserRole.MANAGER },
  { login: 'joao.garcom', name: 'João Garçom', role: EUserRole.WAITER },
  { login: 'carlos.cozinha', name: 'Carlos Cozinha', role: EUserRole.COOK },
];

export interface SeedIngredient {
  name: string;
  inStock: boolean;
}

export interface SeedItem {
  name: string;
  description: string;
  price: number;
  category: EItemCategory;
  requiresPreparation: boolean;
  ingredientNames: string[];
}

export const SEED_INGREDIENTS: SeedIngredient[] = [
  { name: 'Mussarela', inStock: true },
  { name: 'Catupiry', inStock: true },
  { name: 'Calabresa', inStock: true },
  { name: 'Cebola', inStock: true },
  { name: 'Presunto', inStock: true },
  { name: 'Ovo', inStock: true },
  { name: 'Molho de Tomate', inStock: true },
  { name: 'Massa de Pizza', inStock: true },
  { name: 'Provolone', inStock: true },
  { name: 'Parmesão', inStock: true },
  { name: 'Frango', inStock: true },
  { name: 'Carne Bovina', inStock: true },
];

export const SEED_ITEMS: SeedItem[] = [
  {
    name: 'Calabresa',
    description: 'Calabresa sausage, onions and mozzarella over tomato sauce',
    price: 45,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientNames: ['Mussarela', 'Calabresa', 'Cebola', 'Molho de Tomate'],
  },
  {
    name: 'Mussarela',
    description: 'Classic mozzarella pizza with tomato sauce',
    price: 40,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientNames: ['Mussarela', 'Massa de Pizza', 'Molho de Tomate'],
  },
  {
    name: 'Portuguesa',
    description: 'Ham, eggs, onions and mozzarella',
    price: 46,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientNames: [
      'Mussarela',
      'Presunto',
      'Ovo',
      'Cebola',
      'Massa de Pizza',
    ],
  },
  {
    name: 'Quatro Queijos',
    description:
      'Four-cheese pizza: mozzarella, catupiry, provolone and parmesan',
    price: 52,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientNames: [
      'Mussarela',
      'Catupiry',
      'Provolone',
      'Parmesão',
      'Massa de Pizza',
    ],
  },
  {
    name: 'Calabresa Especial',
    description: 'Calabresa sausage with mozzarella and catupiry',
    price: 55,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientNames: ['Mussarela', 'Catupiry', 'Calabresa'],
  },
  {
    name: 'Parmegiana de Frango',
    description:
      'Breaded chicken fillet topped with tomato sauce and mozzarella',
    price: 60,
    category: EItemCategory.DISH,
    requiresPreparation: true,
    ingredientNames: ['Frango', 'Mussarela', 'Molho de Tomate'],
  },
  {
    name: 'Parmegiana de Carne',
    description: 'Beef steak topped with tomato sauce and mozzarella',
    price: 65,
    category: EItemCategory.DISH,
    requiresPreparation: true,
    ingredientNames: ['Carne Bovina', 'Mussarela', 'Molho de Tomate'],
  },
  {
    name: 'Refrigerante Lata',
    description: 'Canned soft drink',
    price: 8,
    category: EItemCategory.DRINK,
    requiresPreparation: false,
    ingredientNames: [],
  },
  {
    name: 'Suco Natural',
    description: 'Natural fruit juice',
    price: 12,
    category: EItemCategory.DRINK,
    requiresPreparation: false,
    ingredientNames: [],
  },
  {
    name: 'Água',
    description: 'Mineral water',
    price: 5,
    category: EItemCategory.DRINK,
    requiresPreparation: false,
    ingredientNames: [],
  },
];

export const SEED_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Pizzas are registered per size as flat catalog entries whose names carry
// the trailing size token ("Mussarela G" / "Mussarela M"); each seed pizza
// yields its two sized variants at the base price. The token-less legacy
// names stay so past orders keep resolving their catalog item. The sizes
// themselves come from the domain, so a size added there is seeded here.
export const SEED_ITEMS_WITH_SIZES: SeedItem[] = SEED_ITEMS.flatMap((seed) => {
  if (seed.category !== EItemCategory.PIZZA) {
    return [seed];
  }
  return [
    seed,
    ...PIZZA_SIZES.map((size) => ({
      ...seed,
      name: `${seed.name} ${size}`,
    })),
  ];
});
