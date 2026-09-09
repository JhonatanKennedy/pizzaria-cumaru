import { ListKitchenQueueUseCase } from './list-kitchen-queue.js';
import { IOrdersRepository } from '../../../orders/domain/repositories/orders-repository.js';
import { ICatalogRepository } from '../../../catalog/domain/repositories/catalog-repository.js';
import { Order } from '../../../orders/domain/entities/orders.js';
import { OrderItems } from '../../../orders/domain/entities/order-items.js';
import { Item } from '../../../catalog/domain/entities/items.js';
import { Ingredient } from '../../../catalog/domain/entities/ingredients.js';
import { EOrderType } from '../../../orders/domain/enums/order-type.js';
import { EItemCategory } from '../../../catalog/domain/enums/item-category.js';
import { EOrderItemStatus } from '../../../orders/domain/enums/order-item-status.js';

const PIZZA_ITEM_ID = 'catalog-pizza-1';
const INGREDIENT_ID = 'ingredient-1';
const BASE_TIME = new Date('2026-09-07T12:00:00Z');

function makeOrder(
  id: string,
  type: EOrderType,
  createdAt: Date,
  tableId?: string,
): Order {
  return Order.create({
    id,
    userId: 1,
    type,
    createdAt,
    tableId,
    customerName: type === EOrderType.DELIVERY ? 'Maria Souza' : undefined,
    address: type === EOrderType.DELIVERY ? 'Rua A' : undefined,
  });
}

function makePizza(
  orderId: string,
  id = 'item-1',
  createdAt = BASE_TIME,
  notes?: string,
): OrderItems {
  return OrderItems.create({
    id,
    orderId,
    itemId: PIZZA_ITEM_ID,
    unitPrice: 45,
    quantity: 1,
    requiresPreparation: true,
    createdAt,
    notes,
  });
}

function makeDrink(
  orderId: string,
  id = 'drink-1',
  createdAt = BASE_TIME,
): OrderItems {
  return OrderItems.create({
    id,
    orderId,
    itemId: 'catalog-drink-1',
    unitPrice: 8,
    quantity: 1,
    requiresPreparation: false,
    createdAt,
  });
}

function makePizzaCatalogItem(ingredientIds: string[] = [INGREDIENT_ID]): Item {
  return Item.create({
    id: PIZZA_ITEM_ID,
    name: 'Calabresa',
    description: 'Pizza de calabresa',
    price: 45,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientIds,
  });
}

function makeIngredient(inStock: boolean): Ingredient {
  return Ingredient.create({ id: INGREDIENT_ID, name: 'Mussarela', inStock });
}

function makeUseCase(
  orders: Order[],
  items: Item[],
  ingredients: Ingredient[],
): ListKitchenQueueUseCase {
  const ordersRepository = {
    findById: vi.fn(async () => null),
    findAllOpen: vi.fn(async () => orders),
    save: vi.fn(async () => undefined),
  } as unknown as IOrdersRepository;
  const catalogRepository = {
    findAllItems: vi.fn(async () => items),
    findAllIngredients: vi.fn(async () => ingredients),
  } as unknown as ICatalogRepository;
  return new ListKitchenQueueUseCase(ordersRepository, catalogRepository);
}

describe('ListKitchenQueueUseCase', () => {
  it('should split open orders into Delivery and Local queues', async () => {
    const deliveryOrder = makeOrder(
      'delivery-1',
      EOrderType.DELIVERY,
      BASE_TIME,
    );
    deliveryOrder.addItem(makePizza('delivery-1'));
    const localOrder = makeOrder('local-1', EOrderType.LOCAL, BASE_TIME, '3');
    localOrder.addItem(makePizza('local-1'));

    const queue = await makeUseCase(
      [deliveryOrder, localOrder],
      [makePizzaCatalogItem()],
      [makeIngredient(true)],
    ).execute();

    expect(queue.delivery.map((order) => order.orderId)).toEqual([
      'delivery-1',
    ]);
    expect(queue.local.map((order) => order.orderId)).toEqual(['local-1']);
    expect(queue.local[0].tableId).toBe('3');
  });

  it('should expose the order item id per line, distinct for repeated catalog items', async () => {
    const order = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    order.addItem(makePizza('table-3', 'line-1'));
    order.addItem(makePizza('table-3', 'line-2'));

    const queue = await makeUseCase(
      [order],
      [makePizzaCatalogItem()],
      [makeIngredient(true)],
    ).execute();

    expect(queue.local[0].items.map((item) => item.orderItemId)).toEqual([
      'line-1',
      'line-2',
    ]);
  });

  it('should expose the order item notes, empty when the item has none', async () => {
    const order = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    order.addItem(makePizza('table-3', 'line-1', BASE_TIME, 'sem cebola'));
    order.addItem(makePizza('table-3', 'line-2'));

    const queue = await makeUseCase(
      [order],
      [makePizzaCatalogItem()],
      [makeIngredient(true)],
    ).execute();

    expect(queue.local[0].items.map((item) => item.notes)).toEqual([
      'sem cebola',
      '',
    ]);
  });

  it('should order each queue by arrival, earliest first', async () => {
    const earlier = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    earlier.addItem(makePizza('table-3'));
    const later = makeOrder(
      'table-7',
      EOrderType.LOCAL,
      new Date('2026-09-07T12:20:00Z'),
      '7',
    );
    later.addItem(makePizza('table-7'));

    const queue = await makeUseCase(
      [later, earlier],
      [makePizzaCatalogItem()],
      [makeIngredient(true)],
    ).execute();

    expect(queue.local.map((order) => order.orderId)).toEqual([
      'table-3',
      'table-7',
    ]);
  });

  it('should not show items that do not require preparation', async () => {
    const order = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    order.addItem(makePizza('table-3'));
    order.addItem(makeDrink('table-3'));

    const queue = await makeUseCase(
      [order],
      [makePizzaCatalogItem()],
      [makeIngredient(true)],
    ).execute();

    expect(queue.local[0].items.map((item) => item.itemId)).toEqual([
      PIZZA_ITEM_ID,
    ]);
  });

  it('should hide items whose ingredients are unavailable, dropping orders with no visible items', async () => {
    const order = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    order.addItem(makePizza('table-3'));

    const queue = await makeUseCase(
      [order],
      [makePizzaCatalogItem()],
      [makeIngredient(false)],
    ).execute();

    expect(queue.local).toHaveLength(0);
  });

  it('should show a Preparing item in its arrival position with the Preparing badge', async () => {
    const order = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    order.addItem(makePizza('table-3'));
    order.addItem(
      OrderItems.create({
        id: 'dish-1',
        orderId: 'table-3',
        itemId: 'catalog-dish-1',
        unitPrice: 30,
        quantity: 1,
        requiresPreparation: true,
        createdAt: new Date('2026-09-07T12:05:00Z'),
      }),
    );
    order.getItems()[0].startPreparation();

    const items = [makePizzaCatalogItem()].concat([
      Item.create({
        id: 'catalog-dish-1',
        name: 'Parmegiana de Frango',
        description: 'Frango a parmegiana',
        price: 30,
        category: EItemCategory.DISH,
        requiresPreparation: true,
      }),
    ]);
    const queue = await makeUseCase([order], items, [
      makeIngredient(true),
    ]).execute();

    expect(queue.local[0].items).toHaveLength(2);
    expect(queue.local[0].items[0].status).toBe(EOrderItemStatus.PREPARING);
    expect(queue.local[0].items[1].status).toBe(EOrderItemStatus.PENDING);
  });

  it('should not show items confirmed Ready', async () => {
    const order = makeOrder('table-3', EOrderType.LOCAL, BASE_TIME, '3');
    const pizza = makePizza('table-3');
    order.addItem(pizza);
    pizza.startPreparation();
    pizza.finishPreparation();

    const queue = await makeUseCase(
      [order],
      [makePizzaCatalogItem()],
      [makeIngredient(true)],
    ).execute();

    expect(queue.local).toHaveLength(0);
  });
});
