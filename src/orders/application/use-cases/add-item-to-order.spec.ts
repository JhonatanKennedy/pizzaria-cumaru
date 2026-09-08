import { AddItemToOrderUseCase } from './add-item-to-order.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import type { ICatalogRepository } from '../../catalog/domain/repositories/catalog-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { Item } from '../../../catalog/domain/entities/items.js';
import { Ingredient } from '../../../catalog/domain/entities/ingredients.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EItemCategory } from '../../../catalog/domain/enums/item-category.js';

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
  price = 45,
  ingredientIds: string[] = [INGREDIENT_ID],
): Item {
  return Item.create({
    id: PIZZA_ID,
    name: 'Calabresa',
    description: 'Pizza de calabresa',
    price,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientIds,
  });
}

function makeFlavor(name: string, price: number): Item {
  return Item.create({
    id: `catalog-${name}`,
    name,
    description: `Pizza ${name}`,
    price,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
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
    findItemByName: vi.fn(
      async (name: string) =>
        flavors.find((item) => item.getName() === name) ?? null,
    ),
  } as unknown as ICatalogRepository;
  return { ordersRepository, catalogRepository };
}

describe('AddItemToOrderUseCase', () => {
  it('should snapshot the catalog price and record the item', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(45),
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
    expect(order.getItems()[0].getFlavors()).toEqual(['Calabresa']);
    expect(ordersRepository.save).toHaveBeenCalledWith(order);
  });

  it('should price a split pizza at the highest flavor price and record the flavors', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(40),
      [
        Ingredient.create({
          id: INGREDIENT_ID,
          name: 'Mussarela',
          inStock: true,
        }),
      ],
      [makeFlavor('Portuguesa', 46)],
    );
    const useCase = new AddItemToOrderUseCase(
      ordersRepository,
      catalogRepository,
    );

    await useCase.execute({
      orderId: ORDER_ID,
      itemId: PIZZA_ID,
      flavors: ['Calabresa', 'Portuguesa'],
    });

    expect(order.getItems()[0].getUnitPrice()).toBe(46);
    expect(order.getItems()[0].getFlavors()).toEqual([
      'Calabresa',
      'Portuguesa',
    ]);
  });

  it('should refuse an item whose ingredient is unavailable', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(45),
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

  it('should record the notes on the item', async () => {
    const order = makeOpenOrder();
    const { ordersRepository, catalogRepository } = makeFakes(
      order,
      makePizza(45),
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
      makePizza(45),
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
