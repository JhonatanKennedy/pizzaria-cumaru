import { AddItemToOrderUseCase } from './add-item-to-order.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import type { ICatalogRepository } from '../../../catalog/domain/repositories/catalog-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { Item } from '../../../catalog/domain/entities/items.js';
import { Ingredient } from '../../../catalog/domain/entities/ingredients.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EItemCategory } from '../../../catalog/domain/enums/item-category.js';
import type { TFlavorPart } from '../../domain/entities/order-items.js';

const ORDER_ID = 'order-1';
const PIZZA_ID = 'catalog-pizza-1';
const INGREDIENT_ID = 'ingredient-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeOpenOrder(): Order {
  return Order.create({
    id: ORDER_ID,
    userId: 1,
    type: EOrderType.LOCAL,
    createdAt: CREATED_AT,
    tableId: '5',
  });
}

function makePizza(
  name = 'Calabresa G',
  price = 45,
  ingredientIds: string[] = [INGREDIENT_ID],
): Item {
  return Item.create({
    id: PIZZA_ID,
    name,
    description: `Pizza ${name}`,
    price,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientIds,
  });
}

function makeFlavor(
  name: string,
  price: number,
  ingredientIds: string[] = [],
): Item {
  return Item.create({
    id: `catalog-${name}`,
    name,
    description: `Pizza ${name}`,
    price,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientIds,
  });
}

function makeDrink(name: string, price: number): Item {
  return Item.create({
    id: `catalog-${name}`,
    name,
    description: name,
    price,
    category: EItemCategory.DRINK,
    requiresPreparation: false,
  });
}

function makeFakes(
  order: Order | null,
  catalogItem: Item | null,
  ingredients: Ingredient[],
  flavors: Item[] = [],
) {
  const ordersRepository = {
    findById: vi.fn(async () => order),
    findAllOpen: vi.fn(async () => []),
    findOpenByTableId: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
  } as unknown as IOrdersRepository;
  const catalogRepository = {
    findAllItems: vi.fn(async () =>
      catalogItem ? [catalogItem, ...flavors] : [],
    ),
    findAllIngredients: vi.fn(async () => ingredients),
    findItemById: vi.fn(async () => catalogItem),
    findItemByName: vi.fn(async (name: string) => {
      if (catalogItem && catalogItem.getName() === name) {
        return catalogItem;
      }
      return flavors.find((item) => item.getName() === name) ?? null;
    }),
  } as unknown as ICatalogRepository;
  return { ordersRepository, catalogRepository };
}

describe('AddItemToOrderUseCase', () => {
  it('should snapshot the price and record the whole-canvas part', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await useCase.execute({ orderId: ORDER_ID, itemId: PIZZA_ID });

    expect(order.getItems()).toHaveLength(1);
    expect(order.getItems()[0].getUnitPrice()).toBe(45);
    expect(order.getItems()[0].getQuantity()).toBe(1);
    expect(order.getItems()[0].getParts()).toEqual([
      { name: 'Calabresa G', pieces: 8 },
    ]);
    expect(ordersRepository.save).toHaveBeenCalledWith(order);
  });

  it('should record a split pizza half and half at the higher flavor price', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza('Calabresa G', 40),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
      [makeFlavor('Portuguesa G', 46)],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );
    const parts: TFlavorPart[] = [
      { name: 'Calabresa G', pieces: 4 },
      { name: 'Portuguesa G', pieces: 4 },
    ];

    await useCase.execute({
      orderId: ORDER_ID,
      itemId: PIZZA_ID,
      parts,
    });

    expect(order.getItems()[0].getUnitPrice()).toBe(46);
    expect(order.getItems()[0].getParts()).toEqual(parts);
  });

  it('should record a pizza composed with pieces of another flavor', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza('Mussarela G', 45),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Farinha',
          inStock: true,
        }),
      ],
      [makeFlavor('Chocolate G', 52)],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await useCase.execute({
      orderId: ORDER_ID,
      itemId: PIZZA_ID,
      parts: [
        { name: 'Mussarela G', pieces: 6 },
        { name: 'Chocolate G', pieces: 2 },
      ],
    });

    expect(order.getItems()[0].getParts()).toEqual([
      { name: 'Mussarela G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
    expect(order.getItems()[0].getUnitPrice()).toBe(52);
  });

  it('should record no parts for a non-pizza item', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makeDrink('Coca-Cola 2L', 10),
      [],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await useCase.execute({
      orderId: ORDER_ID,
      itemId: 'catalog-Coca-Cola 2L',
    });

    expect(order.getItems()[0].getUnitPrice()).toBe(10);
    expect(order.getItems()[0].getParts()).toEqual([]);
  });

  it('should refuse parts that do not cover the pizza canvas', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
      [makeFlavor('Portuguesa G', 46)],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: PIZZA_ID,
        parts: [
          { name: 'Calabresa G', pieces: 3 },
          { name: 'Portuguesa G', pieces: 3 },
        ],
      }),
    ).rejects.toThrow('Flavor pieces must sum to the pizza size');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it('should refuse a flavor of another pizza size', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza('Calabresa M', 40),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
      [makeFlavor('Portuguesa G', 46)],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: PIZZA_ID,
        parts: [
          { name: 'Calabresa M', pieces: 4 },
          { name: 'Portuguesa G', pieces: 2 },
        ],
      }),
    ).rejects.toThrow('Flavor must match the pizza size');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it('should refuse a flavor that is not a registered pizza', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: PIZZA_ID,
        parts: [
          { name: 'Calabresa G', pieces: 4 },
          { name: 'Bacon G', pieces: 4 },
        ],
      }),
    ).rejects.toThrow('Flavor is not a registered pizza');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['zero fatias', 0],
    ['negative fatias', -1],
    ['fractional fatias', 1.5],
  ])('should refuse a flavor given %s', async (_label, pieces) => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
      [makeFlavor('Portuguesa G', 46)],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: PIZZA_ID,
        parts: [
          { name: 'Calabresa G', pieces: 4 },
          { name: 'Portuguesa G', pieces },
        ],
      }),
    ).rejects.toThrow('Flavor pieces must sum to the pizza size');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it('should refuse a composition on an item that is not a pizza', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makeDrink('Coca-Cola 2L', 10),
      [],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: 'catalog-Coca-Cola 2L',
        parts: [{ name: 'Calabresa G', pieces: 8 }],
      }),
    ).rejects.toThrow('Flavor must match the pizza size');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  // A token-less name is a legacy catalog entry with no fatia canvas to cover,
  // so there is nothing for a composition to add up to.
  it('should refuse a composition on a pizza whose name carries no size', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza('Calabresa'),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: PIZZA_ID,
        parts: [{ name: 'Calabresa', pieces: 8 }],
      }),
    ).rejects.toThrow('Flavor must match the pizza size');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it('should refuse an item whose ingredient is unavailable', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: false,
        }),
      ],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: PIZZA_ID }),
    ).rejects.toThrow('Item is unavailable');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it('should refuse a pizza composed with an unavailable flavor', async () => {
    const order = makeOpenOrder();
    const flavorIngredientId = 'ingredient-mussarela';
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Farinha',
          inStock: true,
        }),
        Ingredient.create({
          id: flavorIngredientId,
          name: 'Mussarela',
          inStock: false,
        }),
      ],
      [makeFlavor('Mussarela G', 45, [flavorIngredientId])],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: PIZZA_ID,
        parts: [
          { name: 'Calabresa G', pieces: 4 },
          { name: 'Mussarela G', pieces: 4 },
        ],
      }),
    ).rejects.toThrow('Item is unavailable');
    expect(order.getItems()).toHaveLength(0);
    expect(ordersRepository.save).not.toHaveBeenCalled();
  });

  it('should record the notes on the item', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await useCase.execute({
      orderId: ORDER_ID,
      itemId: PIZZA_ID,
      notes: 'no onions, stuffed crust',
    });

    expect(order.getItems()[0].getNotes()).toBe('no onions, stuffed crust');
  });

  it('should refuse adding to a closed order', async () => {
    const closedOrder = Order.restore({
      id: ORDER_ID,
      userId: 1,
      type: EOrderType.LOCAL,
      createdAt: CREATED_AT,
      tableId: '5',
      status: EOrderStatus.CLOSED,
      items: [],
      cancellationHistory: [],
    });
    const { ordersRepository, catalogRepository } = makeFakes(
      closedOrder,
      makePizza(),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: PIZZA_ID }),
    ).rejects.toThrow('Cannot change a closed order');
  });

  it('should refuse an unknown catalog item', async () => {
    const { ordersRepository, catalogRepository } = makeFakes(
      makeOpenOrder(),
      null,
      [],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: 'unknown' }),
    ).rejects.toThrow('Item not found');
  });
});
