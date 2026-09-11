import {
  SEED_INGREDIENTS,
  SEED_ITEMS,
  SEED_ITEMS_WITH_SIZES,
  SEED_TABLES,
  SEED_USERS,
} from './seed-data.js';
import type { SeedItem } from './seed-data.js';
import { EItemCategory } from '../catalog/domain/enums/item-category.js';
import { PIZZA_SIZES, pizzaSizeOf } from '../catalog/domain/sizes.js';

// The seed writes to Postgres, so a mistake in here surfaces as a half-seeded
// database: the component loops run before the link loop, and the link loop's
// own guard throws only after those writes have landed. These checks are the
// same invariants, moved to where they cost nothing to run.

function findSeeded(name: string): SeedItem | undefined {
  return SEED_ITEMS_WITH_SIZES.find((entry) => entry.name === name);
}

function seededNames(): string[] {
  return SEED_ITEMS_WITH_SIZES.map((entry) => entry.name);
}

describe('SEED_ITEMS_WITH_SIZES', () => {
  it('should register a pizza under its base name and under each size', () => {
    const names = seededNames();

    expect(names).toContain('Calabresa');
    expect(names).toContain('Calabresa G');
    expect(names).toContain('Calabresa M');
  });

  it('should expand every pizza and leave every other item untouched', () => {
    const pizzas = SEED_ITEMS.filter(
      (seed) => seed.category === EItemCategory.PIZZA,
    );
    const others = SEED_ITEMS.filter(
      (seed) => seed.category !== EItemCategory.PIZZA,
    );

    expect(pizzas).not.toHaveLength(0);
    expect(SEED_ITEMS_WITH_SIZES).toHaveLength(
      pizzas.length * (1 + PIZZA_SIZES.length) + others.length,
    );
  });

  it('should size every pizza, not just the first', () => {
    const pizzas = SEED_ITEMS.filter(
      (seed) => seed.category === EItemCategory.PIZZA,
    );
    // Asked of the domain's own parser rather than by re-running the seed's
    // rule, so the two derivations stay independent.
    const sized = seededNames().filter((name) => pizzaSizeOf(name) !== null);

    expect(sized).toHaveLength(pizzas.length * PIZZA_SIZES.length);
  });

  it('should give a sized variant the same recipe, description and price as its base', () => {
    const pizzas = SEED_ITEMS.filter(
      (seed) => seed.category === EItemCategory.PIZZA,
    );

    for (const pizza of pizzas) {
      for (const size of PIZZA_SIZES) {
        expect(findSeeded(`${pizza.name} ${size}`)).toMatchObject({
          description: pizza.description,
          price: pizza.price,
          category: pizza.category,
          requiresPreparation: pizza.requiresPreparation,
          ingredientNames: pizza.ingredientNames,
        });
      }
    }
  });

  it('should give every item a distinct name', () => {
    const names = seededNames();
    // The seed matches rows with `findFirst({ name })`, so two entries sharing
    // a name would collapse into one row and the second would overwrite the
    // first without a word.
    expect(new Set(names).size).toBe(names.length);
  });

  it('should only link ingredients the seed also creates', () => {
    const seeded = new Set(SEED_INGREDIENTS.map((seed) => seed.name));
    const unknown = SEED_ITEMS_WITH_SIZES.flatMap((item) =>
      item.ingredientNames.filter((name) => !seeded.has(name)),
    );

    expect(unknown).toEqual([]);
  });
});

describe('SEED_TABLES', () => {
  it('should seed distinct, positive table numbers', () => {
    // `Table.create` refuses a number below one and the column is unique, so
    // either mistake aborts the seed partway through.
    expect(SEED_TABLES.filter((number) => number < 1)).toEqual([]);
    expect(new Set(SEED_TABLES).size).toBe(SEED_TABLES.length);
  });
});

describe('SEED_USERS', () => {
  it('should seed distinct logins', () => {
    // The upsert is keyed on the login, so a duplicate would quietly leave the
    // seed one user short of the count it prints.
    const logins = SEED_USERS.map((user) => user.login);

    expect(new Set(logins).size).toBe(logins.length);
  });
});
