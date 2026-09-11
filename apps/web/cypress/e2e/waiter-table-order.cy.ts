// Journeys from features/03_table_order.feature, 05_waiter_profile.feature and
// 09_cancellation_and_payment.feature.
//
// Everything the waiter does here goes through the UI — his floor and his order
// detail are the screens under test. The kitchen is the one leg that cannot: the
// cook is a second role with a screen of its own, so support/api.ts drives it
// over HTTP and the waiter's row is asserted against what the kitchen did.
import { SEEDED_USERS } from '../support/accounts';
import {
  addItem as seedItem,
  apiLogin,
  menuItemId,
  openTableOrder,
  prepareWholeOrder,
  type ISeededSession,
} from '../support/api';

// One table per test. The suite shares a single database for the whole run, so
// a table one test opens must not be a table another one asserts on.
const TABLES = {
  floor: 1,
  add: 2,
  split: 3,
  quantity: 4,
  itemCancel: 5,
  orderCancel: 6,
  kitchen: 7,
} as const;

const PIZZA = 'Calabresa G';

// formatComposition renders clean shares as fractions: the base keeps 2 of the
// 8 fatias (1/4), Mussarela takes 4 (1/2) and Portuguesa 2 (1/4).
const SPLIT_COMPOSITION = 'Calabresa 1/4 · Mussarela 1/2 · Portuguesa 1/4';

// Anchored, so "Mesa 1" cannot match the "Mesa 10" card.
function tableCard(number: number): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .contains('h2', new RegExp(`^Mesa ${number}$`))
    .parent()
    .parent();
}

function addItemPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('h2', 'Adicionar item').parent();
}

function itemsCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('h2', 'Itens do pedido').parent();
}

function flavorComposer(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('p', 'Sabores').parent();
}

// The stepper's count carries no accessible name of its own — it is the readout
// between the two buttons, and reading it back is the only way to see the
// quantity the server kept.
function quantityReadout(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('button[aria-label="Diminuir quantidade"]').next();
}

function openTable(number: number): void {
  cy.visit('/waiter/tables');
  tableCard(number).within(() => {
    cy.contains('button', 'Abrir mesa').click();
  });
  cy.contains('h1', new RegExp(`^Mesa ${number}$`)).should('be.visible');
}

function addItemThroughPanel(
  name: string,
  options: { quantity?: number; notes?: string } = {},
): void {
  addItemPanel().within(() => {
    // The panel opens on Pizzas, and the query is composed with the category —
    // so a drink is only reachable once the category is let go.
    cy.contains('button', 'Todas').click();
    cy.get('#waiter-item-search').clear().type(name);
    cy.contains('button', name).click();
    if (options.quantity !== undefined) {
      cy.get('#quantity').clear().type(String(options.quantity));
    }
    if (options.notes !== undefined) {
      cy.get('#notes').clear().type(options.notes);
    }
    cy.contains('button', 'Adicionar ao pedido').click();
  });
  itemsCard().within(() => {
    cy.contains('li', name).should('be.visible');
  });
}

function increaseFlavor(name: string, times: number): void {
  for (let click = 0; click < times; click += 1) {
    cy.get(`button[aria-label="Aumentar ${name}"]`).click();
  }
}

// Adds the pizza to an open order and has the cook drive it to Ready. The
// lineup goes in with the waiter's token — the cook's reaches the kitchen's
// routes and nothing else — and only the preparation is his.
function prepareOrderAsCook(
  waiter: ISeededSession,
  orderId: string,
): Cypress.Chainable<void> {
  return apiLogin(SEEDED_USERS.cook).then((cook) =>
    menuItemId(waiter.token, PIZZA).then((itemId) =>
      seedItem(waiter.token, orderId, itemId).then(() =>
        prepareWholeOrder(cook.token, orderId),
      ),
    ),
  );
}

describe('Waiter table order', () => {
  it('shows the table as taken on the floor once its order is opened', () => {
    cy.loginAs(SEEDED_USERS.waiter);
    cy.visit('/waiter/tables');

    tableCard(TABLES.floor).within(() => {
      cy.contains('Livre').should('be.visible');
      cy.contains('button', 'Abrir mesa').click();
    });
    cy.contains('h1', new RegExp(`^Mesa ${TABLES.floor}$`)).should(
      'be.visible',
    );

    cy.get('[aria-label="Voltar para Pedidos de mesa"]').click();

    // The floor listing is fresh for 30s (routes/query-client.ts), so a card
    // that reads "Aberta" here is a card the create mutation invalidated on its
    // way out — remounting the floor on its own would have served the copy
    // cached before the order existed.
    tableCard(TABLES.floor).within(() => {
      cy.contains('Aberta').should('be.visible');
    });
  });

  it('adds an item with a quantity and a note', () => {
    cy.loginAs(SEEDED_USERS.waiter);
    openTable(TABLES.add);

    cy.intercept('POST', '**/orders/*/items').as('addItem');
    addItemThroughPanel('Refrigerante Lata', {
      quantity: 2,
      notes: 'Bem gelada',
    });

    // The note has no read-back on this screen — the order line renders the
    // name, the status, the composition and the price, and the kitchen tile is
    // where a note surfaces. The payload is what proves the field is wired.
    cy.wait('@addItem').then(({ request }) => {
      expect(request.body.quantity).to.equal(2);
      expect(request.body.notes).to.equal('Bem gelada');
    });

    quantityReadout().should('have.text', '2');
  });

  it("splits a G pizza's eight fatias among other G pizzas", () => {
    cy.loginAs(SEEDED_USERS.waiter);
    openTable(TABLES.split);

    addItemPanel().within(() => {
      cy.contains('button', 'Todas').click();
      cy.get('#waiter-item-search').clear().type(PIZZA);
      cy.contains('button', PIZZA).click();
    });

    flavorComposer().within(() => {
      cy.contains(
        'p',
        'Calabresa (base) fica com 8 fatias — pizza G de 8 fatias',
      ).should('be.visible');

      cy.contains('button', 'Mussarela').click();
      increaseFlavor('Mussarela G', 3);
      cy.contains('button', 'Portuguesa').click();
      increaseFlavor('Portuguesa G', 1);

      cy.contains(
        'p',
        'Calabresa (base) fica com 2 fatias — pizza G de 8 fatias',
      ).should('be.visible');
      cy.contains('li', 'Mussarela — 4 fatias').should('be.visible');
      cy.contains('li', 'Portuguesa — 2 fatias').should('be.visible');
    });

    addItemPanel().within(() => {
      cy.contains('button', 'Adicionar ao pedido').click();
    });

    itemsCard().within(() => {
      cy.contains('li', PIZZA).should('be.visible');
      cy.contains(SPLIT_COMPOSITION).should('be.visible');
    });
  });

  it("adjusts an item's quantity from the order row", () => {
    cy.loginAs(SEEDED_USERS.waiter);
    openTable(TABLES.quantity);
    addItemThroughPanel('Água');

    // One item on the order, so one stepper on the page — nothing to scope to.
    cy.get('button[aria-label="Diminuir quantidade"]').should('be.disabled');

    cy.get('button[aria-label="Aumentar quantidade"]').click();
    quantityReadout().should('have.text', '2');

    cy.get('button[aria-label="Diminuir quantidade"]').click();
    quantityReadout().should('have.text', '1');
    cy.get('button[aria-label="Diminuir quantidade"]').should('be.disabled');
  });

  it('cancels a pending item and leaves the rest of the order alone', () => {
    cy.loginAs(SEEDED_USERS.waiter);
    openTable(TABLES.itemCancel);
    addItemThroughPanel(PIZZA);
    addItemThroughPanel('Água');

    itemsCard().within(() => {
      cy.contains('li', PIZZA).within(() => {
        cy.contains('Pendente').should('be.visible');
        cy.contains('button', 'Cancelar').click();
      });
    });

    cy.get('[role="dialog"]').within(() => {
      cy.contains(`Cancelar ${PIZZA}`).should('be.visible');
      cy.contains('button', 'Cancelar item').click();
    });

    itemsCard().within(() => {
      cy.contains('li', PIZZA).should('not.exist');
      cy.contains('li', 'Água').should('be.visible');
    });
  });

  it('cancels the whole order and frees the table', () => {
    cy.loginAs(SEEDED_USERS.waiter);
    openTable(TABLES.orderCancel);
    addItemThroughPanel('Água');

    cy.contains('button', 'Cancelar pedido').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', 'Cancelar pedido').click();
    });

    cy.location('pathname').should('equal', '/waiter/tables');
    tableCard(TABLES.orderCancel).within(() => {
      cy.contains('Livre').should('be.visible');
    });
  });

  it('shows the order as ready once the kitchen has finished it', () => {
    // The order is seeded over http rather than driven through the panel. The
    // two http logins mint tokens and nothing else — `cy.request` does not put
    // the refresh cookie in the browser's jar — so neither can disturb the
    // session the form login below establishes.
    apiLogin(SEEDED_USERS.waiter)
      .then((waiter) =>
        openTableOrder(waiter, TABLES.kitchen).then((orderId) =>
          prepareOrderAsCook(waiter, orderId).then(() => orderId),
        ),
      )
      .as('orderId');

    cy.loginAs(SEEDED_USERS.waiter);
    cy.get<string>('@orderId').then((orderId) => {
      cy.visit(`/waiter/orders/${orderId}`);
    });

    itemsCard().within(() => {
      cy.contains('li', PIZZA).within(() => {
        cy.contains('Pronto').should('be.visible');
      });
    });
  });
});
