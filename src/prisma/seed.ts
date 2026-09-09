import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from './generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { isProduction } from '../config/env.validation.js';
import { EItemCategory } from '../catalog/domain/enums/item-category.js';

loadEnv({ path: '.env.local' });

if (isProduction(process.env.NODE_ENV)) {
  throw new Error('Seed script refuses to run in production');
}

const SEED_PASSWORD = 'SenhaSegura123';
const SEED_USERS = [
  { login: 'ana.gerente', name: 'Ana Gerente', role: 'Manager' },
  { login: 'joao.garcom', name: 'João Garçom', role: 'Waiter' },
  { login: 'carlos.cozinha', name: 'Carlos Cozinha', role: 'Cook' },
] as const;

interface SeedIngredient {
  name: string;
  inStock: boolean;
}

interface SeedItem {
  name: string;
  description: string;
  price: number;
  category: EItemCategory;
  requiresPreparation: boolean;
  ingredientNames: string[];
}

const SEED_INGREDIENTS: SeedIngredient[] = [
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

const SEED_ITEMS: SeedItem[] = [
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

const SEED_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Pizzas are registered per size as flat catalog entries whose names carry
// the trailing size token ("Mussarela G" / "Mussarela M"); each seed pizza
// yields its two sized variants at the base price. The token-less legacy
// names stay so past orders keep resolving their catalog item.
const PIZZA_SIZE_SUFFIXES = ['G', 'M'] as const;
const SEED_ITEMS_WITH_SIZES: SeedItem[] = SEED_ITEMS.flatMap((seed) => {
  if (seed.category !== EItemCategory.PIZZA) {
    return [seed];
  }
  return [
    seed,
    ...PIZZA_SIZE_SUFFIXES.map((suffix) => ({
      ...seed,
      name: `${seed.name} ${suffix}`,
    })),
  ];
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// --- users ---
const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
for (const user of SEED_USERS) {
  await prisma.user.upsert({
    where: { email: user.login },
    update: { name: user.name, role: user.role, passwordHash },
    create: {
      email: user.login,
      name: user.name,
      role: user.role,
      passwordHash,
    },
  });
}

// --- ingredients ---
const ingredientIdsByName = new Map<string, string>();
for (const seed of SEED_INGREDIENTS) {
  const existing = await prisma.ingredient.findFirst({
    where: { name: seed.name },
  });
  const row = existing
    ? await prisma.ingredient.update({
        where: { id: existing.id },
        data: { inStock: seed.inStock },
      })
    : await prisma.ingredient.create({
        data: { name: seed.name, inStock: seed.inStock },
      });
  ingredientIdsByName.set(seed.name, row.id);
}

// --- items ---
// Matches by name: items renamed by a user are left alone and re-created
// under the seed name.
const itemIdsByName = new Map<string, string>();
for (const seed of SEED_ITEMS_WITH_SIZES) {
  const data = {
    name: seed.name,
    description: seed.description,
    price: seed.price,
    category: seed.category,
    requiresPreparation: seed.requiresPreparation,
  };
  const existing = await prisma.item.findFirst({
    where: { name: seed.name },
  });
  const row = existing
    ? await prisma.item.update({ where: { id: existing.id }, data })
    : await prisma.item.create({ data });
  itemIdsByName.set(seed.name, row.id);
}

// --- links ---
let linkCount = 0;
for (const seed of SEED_ITEMS_WITH_SIZES) {
  const itemId = itemIdsByName.get(seed.name);
  if (!itemId) {
    throw new Error(`Seed item not found after upsert: ${seed.name}`);
  }
  for (const ingredientName of seed.ingredientNames) {
    const ingredientId = ingredientIdsByName.get(ingredientName);
    if (!ingredientId) {
      throw new Error(
        `Seed ingredient not found after upsert: ${ingredientName}`,
      );
    }
    await prisma.itemIngredient.upsert({
      where: { itemId_ingredientId: { itemId, ingredientId } },
      create: { itemId, ingredientId },
      update: {},
    });
    linkCount += 1;
  }
}

// --- tables ---
for (const number of SEED_TABLES) {
  const existing = await prisma.table.findUnique({ where: { number } });
  if (!existing) {
    await prisma.table.create({ data: { number } });
  }
}

await prisma.$disconnect();
console.log(
  `Seeded ${SEED_USERS.length} users with password "${SEED_PASSWORD}"`,
);
console.log(
  `Seeded ${SEED_INGREDIENTS.length} ingredients, ${SEED_ITEMS_WITH_SIZES.length} items and ${linkCount} item-ingredient links`,
);
console.log(`Seeded ${SEED_TABLES.length} tables`);
