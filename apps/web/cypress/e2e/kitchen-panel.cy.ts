// Journeys from features/06_cook_profile.feature.
//
// The cook's panel is the only screen under test here. The orders it shows are
// seeded over HTTP with the waiter's token — a cook's token reaches the
// kitchen's routes and nothing else, so it can neither open an order nor read
// one back — and the cook's own session is established through the real login
// form. The http logins mint tokens and nothing else: `cy.request` does not put
// the refresh cookie in the browser's jar, so none of them can disturb the
// session the form login establishes.
//
// The queue is global: it lists every open order's pending and preparing lines,
// so a tile is only ever asserted by a name this spec seeded and inside the
// column its order type owns. Finishing or cancelling a line takes it out of
// the queue, so every test ends with the panel as it found it.
import { apiOrigin, SEEDED_USERS } from '../support/accounts';
import {
  addItem,
  apiLogin,
  findOrder,
  menuItemId,
  openTableOrder,
  prepareWholeOrder,
  type ISeededSession,
} from '../support/api';

// The panel's two columns, as the screen titles them (pages/kitchen/pages/
// kitchen-page.tsx). The server splits the payload the same way.
const DELIVERY_QUEUE = 'Entrega';
const LOCAL_QUEUE = 'Local';

// Seeded tables 1–7 belong to the waiter's spec. These two are this spec's, and
// a table carries one open order at a time — which is why only the arrival-order
// journey spends them: every other fixture is a delivery order, and a delivery
// needs no table. The names are this spec's too, so a tile can never be matched
// against a line another spec left in the queue.
const TABLES = { first: 8, second: 9 } as const;

const FIRST_PIZZA = 'Quatro Queijos G';
const SECOND_PIZZA = 'Calabresa Especial G';
const FIRST_DISH = 'Parmegiana de Frango';
const SECOND_DISH = 'Parmegiana de Carne';
const DRINK = 'Suco Natural';

const NOTE = 'Sem cebola, por favor';

// Mirrors EOrderType.DELIVERY on the api (orders/domain/enums/order-type.ts) —
// it is the wire value the create call carries.
const ORDER_TYPE_DELIVERY = 'Delivery';

interface ISeedOptions {
  quantity?: number;
  notes?: string;
}

interface ISeedLine {
  name: string;
  options?: ISeedOptions;
}

function queueColumn(title: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('h2', title).parent();
}

// The item name is the only paragraph inside a tile's first row; the note and
// the composition are paragraphs of the tile itself, so this reads back exactly
// the names, in the order the server sent them.
function tileNamesIn(title: string): Cypress.Chainable<string[]> {
  return queueColumn(title)
    .find('li > div > p')
    .then(($names) => $names.toArray().map((name) => name.textContent ?? ''));
}

function tile(
  title: string,
  name: string,
): Cypress.Chainable<JQuery<HTMLLIElement>> {
  return queueColumn(title).contains('li', name);
}

// The loading state draws the same two headings over a skeleton, so a
// column-scoped query picks up a rendered panel only once a real tile is up.
function waitForQueue(name: string): void {
  cy.contains('li', name).should('be.visible');
}

// A row leaves the queue through a refetch, so its absence is asserted by a
// callback that re-reads the column until it holds — a one-shot read would fail
// on the frame before the panel redrew.
function expectNoTileIn(title: string, name: string): void {
  queueColumn(title).should(($column) => {
    const names = $column
      .find('li > div > p')
      .toArray()
      .map((entry) => entry.textContent ?? '');
    expect(names).to.not.include(name);
  });
}

// Positions are relative on purpose: the queue is global, so only the order of
// the two names this test seeded is asserted, never the column's whole contents.
function expectArrivalOrder(
  title: string,
  first: string,
  second: string,
): void {
  tileNamesIn(title).then((names) => {
    expect(names).to.include(first);
    expect(names).to.include(second);
    expect(names.indexOf(first)).to.be.lessThan(names.indexOf(second));
  });
}

// POST /orders for a delivery — the one kind of order the waiter's floor does
// not open, and the one that carries a customer instead of a table.
function openDeliveryOrder(
  waiter: ISeededSession,
  customerName: string,
): Cypress.Chainable<string> {
  return cy
    .request<{ id: string }>({
      method: 'POST',
      url: `${apiOrigin()}/orders`,
      headers: { Authorization: `Bearer ${waiter.token}` },
      body: {
        userId: waiter.userId,
        type: ORDER_TYPE_DELIVERY,
        customerName,
        address: 'Rua das Palmeiras, 120',
      },
    })
    .then((response) => response.body.id);
}

function addLine(
  waiter: ISeededSession,
  orderId: string,
  line: ISeedLine,
): Cypress.Chainable<void> {
  return menuItemId(waiter.token, line.name).then((itemId) =>
    addItem(waiter.token, orderId, itemId, line.options),
  );
}

function openOrderWithLine(
  waiter: ISeededSession,
  open: Cypress.Chainable<string>,
  line: ISeedLine,
): Cypress.Chainable<string> {
  return open.then((orderId) =>
    addLine(waiter, orderId, line).then(() => orderId),
  );
}

function seedDeliveryOrder(
  waiter: ISeededSession,
  customerName: string,
  lines: readonly ISeedLine[],
): Cypress.Chainable<string> {
  return openDeliveryOrder(waiter, customerName).then((orderId) =>
    cy
      .wrap(lines, { log: false })
      .each((line: ISeedLine) => {
        addLine(waiter, orderId, line);
      })
      .then(() => orderId),
  );
}

// Two delivery orders, then the two tables — the arrival order the panel has to
// reproduce within each column. Registers one order at a time, so their
// createdAt are distinct and the sort has something to order by.
function seedArrivalFixture(
  waiter: ISeededSession,
): Cypress.Chainable<string[]> {
  return openOrderWithLine(waiter, openDeliveryOrder(waiter, 'Maria Souza'), {
    name: FIRST_DISH,
  }).then((firstDelivery) =>
    openOrderWithLine(waiter, openDeliveryOrder(waiter, 'Joana Lima'), {
      name: SECOND_DISH,
    }).then((secondDelivery) =>
      openOrderWithLine(waiter, openTableOrder(waiter, TABLES.first), {
        name: FIRST_PIZZA,
      }).then((firstLocal) =>
        openOrderWithLine(waiter, openTableOrder(waiter, TABLES.second), {
          name: SECOND_PIZZA,
        }).then((secondLocal) => [
          firstDelivery,
          secondDelivery,
          firstLocal,
          secondLocal,
        ]),
      ),
    ),
  );
}

// Drives every line of the given orders to Ready, which is the state that takes
// them out of the queue. It fails loudly when an order it was handed is not in
// the queue, so it is the cleanup and the proof that it happened.
function clearQueue(
  cookToken: string,
  orderIds: readonly string[],
): Cypress.Chainable<void> {
  return cy
    .wrap(orderIds, { log: false })
    .each((orderId: string) => {
      prepareWholeOrder(cookToken, orderId);
    })
    .then(() => cy.wrap<void>(undefined));
}

describe('Kitchen panel', () => {
  it('shows the delivery and the local queue in the server arrival order', () => {
    apiLogin(SEEDED_USERS.waiter).as('waiter');
    apiLogin(SEEDED_USERS.cook).as('cook');

    cy.get<ISeededSession>('@waiter')
      .then((waiter) => seedArrivalFixture(waiter))
      .as('orderIds');

    cy.loginAs(SEEDED_USERS.cook);
    cy.visit('/kitchen');

    cy.contains('h1', 'Painel da Cozinha').should('be.visible');
    cy.contains('h2', DELIVERY_QUEUE).should('be.visible');
    cy.contains('h2', LOCAL_QUEUE).should('be.visible');

    waitForQueue(FIRST_DISH);

    // Each line sits in the queue its order type owns, and in no other.
    tile(DELIVERY_QUEUE, FIRST_DISH).should('be.visible');
    tile(DELIVERY_QUEUE, SECOND_DISH).should('be.visible');
    tile(LOCAL_QUEUE, FIRST_PIZZA).should('be.visible');
    tile(LOCAL_QUEUE, SECOND_PIZZA).should('be.visible');
    expectNoTileIn(LOCAL_QUEUE, FIRST_DISH);
    expectNoTileIn(DELIVERY_QUEUE, FIRST_PIZZA);

    // The delivery order was registered before the two tables, and the first
    // table before the second: arrival order is display order, per column.
    expectArrivalOrder(DELIVERY_QUEUE, FIRST_DISH, SECOND_DISH);
    expectArrivalOrder(LOCAL_QUEUE, FIRST_PIZZA, SECOND_PIZZA);

    cy.get<string[]>('@orderIds').then((orderIds) => {
      cy.get<ISeededSession>('@cook').then((cook) =>
        clearQueue(cook.token, orderIds),
      );
    });
  });

  it('shows only the lines that require preparation, never a drink', () => {
    apiLogin(SEEDED_USERS.waiter).as('waiter');
    apiLogin(SEEDED_USERS.cook).as('cook');

    cy.get<ISeededSession>('@waiter')
      .then((waiter) =>
        seedDeliveryOrder(waiter, 'Paulo Reis', [
          { name: FIRST_PIZZA },
          { name: FIRST_DISH },
          { name: DRINK },
        ]).then((orderId) =>
          // The drink really is on the order: dropping it is the panel's rule,
          // and a seed that quietly failed would make the absence below pass
          // for the wrong reason.
          menuItemId(waiter.token, DRINK).then((drinkItemId) =>
            findOrder(waiter.token, orderId).then((order) => {
              expect(order.items.map((item) => item.itemId)).to.include(
                drinkItemId,
              );
              return orderId;
            }),
          ),
        ),
      )
      .as('orderId');

    cy.loginAs(SEEDED_USERS.cook);
    cy.visit('/kitchen');

    waitForQueue(FIRST_PIZZA);

    // Both prepared lines are on the board; the drink, on that same order, is
    // not — the panel is a production board, not the order.
    tile(DELIVERY_QUEUE, FIRST_PIZZA).should('be.visible');
    tile(DELIVERY_QUEUE, FIRST_DISH).should('be.visible');
    expectNoTileIn(DELIVERY_QUEUE, DRINK);

    cy.get<string>('@orderId').then((orderId) => {
      cy.get<ISeededSession>('@cook').then((cook) =>
        clearQueue(cook.token, [orderId]),
      );
    });
  });

  it('starts a line and finishes it without touching the rest of the order', () => {
    apiLogin(SEEDED_USERS.waiter).as('waiter');
    apiLogin(SEEDED_USERS.cook).as('cook');

    cy.get<ISeededSession>('@waiter')
      .then((waiter) =>
        seedDeliveryOrder(waiter, 'Carla Nunes', [
          { name: FIRST_DISH },
          { name: FIRST_PIZZA },
        ]),
      )
      .as('orderId');

    cy.loginAs(SEEDED_USERS.cook);
    cy.visit('/kitchen');

    waitForQueue(FIRST_DISH);
    tile(DELIVERY_QUEUE, FIRST_DISH).within(() => {
      cy.contains('Pendente').should('be.visible');
      cy.contains('button', 'Iniciar preparo').click();
    });

    tile(DELIVERY_QUEUE, FIRST_DISH).within(() => {
      cy.contains('Preparando').should('be.visible');
      cy.contains('button', 'Finalizar').click();
    });

    // Ready is not a kitchen state: the finished line leaves the queue while
    // the line beside it stays on the board, still pending.
    expectNoTileIn(DELIVERY_QUEUE, FIRST_DISH);
    tile(DELIVERY_QUEUE, FIRST_PIZZA).within(() => {
      cy.contains('Pendente').should('be.visible');
    });

    // Finishing one line finishes neither its order nor the other lines on it.
    cy.get<ISeededSession>('@waiter').then((waiter) =>
      cy.get<string>('@orderId').then((orderId) =>
        findOrder(waiter.token, orderId).then((order) => {
          expect(order.items.map((item) => item.status)).to.deep.equal([
            'Ready',
            'Pending',
          ]);
          expect(order.status).to.equal('Open');
        }),
      ),
    );

    cy.get<string>('@orderId').then((orderId) => {
      cy.get<ISeededSession>('@cook').then((cook) =>
        clearQueue(cook.token, [orderId]),
      );
    });
  });

  it('cancels a preparation that was started by mistake', () => {
    apiLogin(SEEDED_USERS.waiter).as('waiter');
    apiLogin(SEEDED_USERS.cook).as('cook');

    cy.get<ISeededSession>('@waiter')
      .then((waiter) =>
        openOrderWithLine(waiter, openDeliveryOrder(waiter, 'Rita Alves'), {
          name: SECOND_DISH,
        }),
      )
      .as('orderId');

    cy.loginAs(SEEDED_USERS.cook);
    cy.visit('/kitchen');

    waitForQueue(SECOND_DISH);
    tile(DELIVERY_QUEUE, SECOND_DISH).within(() => {
      cy.contains('button', 'Iniciar preparo').click();
    });

    // Only a line already being prepared can be stopped this way.
    tile(DELIVERY_QUEUE, SECOND_DISH).within(() => {
      cy.contains('Preparando').should('be.visible');
      cy.contains('button', 'Cancelar preparo').click();
    });

    cy.get('[role="dialog"]').within(() => {
      cy.contains(`Cancelar preparo de ${SECOND_DISH}`).should('be.visible');
      cy.contains('O item sairá da fila e o pedido permanecerá aberto.').should(
        'be.visible',
      );
      // The confirmation is reason-less: the dialog asks for it and nothing else.
      cy.get('input, textarea').should('have.length', 0);
      cy.contains('button', 'Cancelar preparo').click();
    });

    expectNoTileIn(DELIVERY_QUEUE, SECOND_DISH);

    // The line left the order with the queue, and the order as a whole is open.
    cy.get<ISeededSession>('@waiter').then((waiter) =>
      cy.get<string>('@orderId').then((orderId) =>
        findOrder(waiter.token, orderId).then((order) => {
          expect(order.status).to.equal('Open');
          expect(order.items).to.have.length(0);
        }),
      ),
    );
  });

  it("shows an item's note on its tile", () => {
    apiLogin(SEEDED_USERS.waiter).as('waiter');
    apiLogin(SEEDED_USERS.cook).as('cook');

    cy.get<ISeededSession>('@waiter')
      .then((waiter) =>
        openOrderWithLine(waiter, openDeliveryOrder(waiter, 'Sofia Mendes'), {
          name: FIRST_DISH,
          options: { notes: NOTE },
        }),
      )
      .as('orderId');

    cy.loginAs(SEEDED_USERS.cook);
    cy.visit('/kitchen');

    waitForQueue(FIRST_DISH);

    // The tile is the surface that renders a note (the waiter's order line has
    // no read-back for it), so this is where the field is proven wired.
    tile(DELIVERY_QUEUE, FIRST_DISH).within(() => {
      cy.contains(NOTE).should('be.visible');
    });

    cy.get<string>('@orderId').then((orderId) => {
      cy.get<ISeededSession>('@cook').then((cook) =>
        clearQueue(cook.token, [orderId]),
      );
    });
  });
});
