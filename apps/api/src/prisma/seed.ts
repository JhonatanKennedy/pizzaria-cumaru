import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from './generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { isProduction } from '../config/env.validation.js';
import {
  SEED_INGREDIENTS,
  SEED_ITEMS_WITH_SIZES,
  SEED_PASSWORD,
  SEED_TABLES,
  SEED_USERS,
} from './seed-data.js';

loadEnv({ path: '.env.local' });

if (isProduction(process.env.NODE_ENV)) {
  throw new Error('Seed script refuses to run in production');
}

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
