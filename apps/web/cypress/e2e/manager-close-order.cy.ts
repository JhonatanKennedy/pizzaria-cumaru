// Journeys from features/07_manager_profile.feature and
// 09_cancellation_and_payment.feature.
//
// The close is the manager's own verb on the order detail she shares with the
// waiter, and the kitchen gate in front of it is the part no api test can
// show: the action she cannot press, and the hint that says why. The order's
// line-up is seeded over http — a manager's token may do everything a
// waiter's may, so she opens the table and adds the items herself — and the
// preparation is the cook's leg, because his token reaches the kitchen's
// routes and nothing else.
import { SEEDED_USERS } from '../support/accounts';
import {
  addItem as seedItem,
  apiLogin,
  menuItemId,
  openTableOrder,
  prepareWholeOrder,
  type ISeededSession,
} from '../support/api';

// The suite shares a single database for the whole run, so the seeded tables
// are staked out per spec: 1–7 belong to waiter-table-order.cy.ts, 8–9 to
// kitchen-panel.cy.ts and 10 to this file. Every journey below ends with what
// it opened closed or cancelled — the table would otherwise still be occupied,
// and a line left in preparation would sit in the kitchen's queue, which is
// global and knows nothing about whose spec put it there.
const TABLE_NUMBER = 10;

const PIZZA = 'Calabresa G';
const WATER = 'Água';

// The dialog is chosen by label; the request carries the value behind it
// (lib/payment-labels.ts maps the two, EPaymentType is what the api persists).
const PIX = { label: 'Pix', value: 'Pix' } as const;
const CASH = { label: 'Dinheiro', value: 'Cash' } as const;

// Anchored, so "Mesa 10" cannot match the "Mesa 1" card.
function tableCard(number: number): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .contains('h2', new RegExp(`^Mesa ${number}$`))
    .parent()
    .parent();
}

// The card carrying the status, the total and the order's actions — the only
// place the close control and the kitchen hint live. Scoping to it is what
// keeps `Fechar conta` from matching the dialog's confirm as well.
function summaryCard(number: number): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .contains('h1', new RegExp(`^Mesa ${number}$`))
    .parent()
    .parent();
}

function closeDialog(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('[role="dialog"]');
}

// Opens the table's existing order the way the manager reaches it: from the
// floor, through the card that links to it. The card reads "Aberta" because
// that is the state the order behind it puts the table in.
function openOrderFromFloor(number: number): void {
  cy.visit('/waiter/tables');
  tableCard(number).within(() => {
    cy.contains('Aberta').should('be.visible');
  });
  tableCard(number).click();
  cy.contains('h1', new RegExp(`^Mesa ${number}$`)).should('be.visible');
}

function cancelOpenOrder(number: number): void {
  summaryCard(number).within(() => {
    cy.contains('button', 'Cancelar pedido').click();
  });
  closeDialog().within(() => {
    cy.contains('button', 'Cancelar pedido').click();
  });
}

// Opens the table's order and puts the named menu items on it, yielding its
// id. A pizza goes in without parts, which the api records as the whole
// pizza's canvas — the flavor composer is the waiter's screen, not this one.
function seedOrder(
  session: ISeededSession,
  itemNames: readonly string[],
): Cypress.Chainable<string> {
  return openTableOrder(session, TABLE_NUMBER).then((orderId) =>
    cy
      .wrap([...itemNames], { log: false })
      .each((name: string) =>
        menuItemId(session.token, name).then((itemId) =>
          seedItem(session.token, orderId, itemId),
        ),
      )
      .then(() => orderId),
  );
}

// Drives every line to Ready, the state the close waits for. The queue is read
// with the cook's token because a cook's token reaches the kitchen's routes
// and nothing else — and the kitchen is what answers "is anything still being
// made?", which is the question the manager's close control asks.
function prepareOrderAsCook(orderId: string): Cypress.Chainable<void> {
  return apiLogin(SEEDED_USERS.cook).then((cook) =>
    prepareWholeOrder(cook.token, orderId),
  );
}

describe('Manager close order', () => {
  it('closes a table order with a payment type and frees the table', () => {
    // The drink never enters the kitchen, so this order has nothing to wait
    // for — the close is available from the moment it is opened.
    apiLogin(SEEDED_USERS.manager).then((manager) =>
      seedOrder(manager, [WATER]),
    );

    cy.loginAs(SEEDED_USERS.manager);
    openOrderFromFloor(TABLE_NUMBER);

    summaryCard(TABLE_NUMBER).within(() => {
      cy.contains('button', 'Fechar conta').should('be.enabled').click();
    });

    cy.intercept('POST', '**/orders/*/close').as('closeOrder');
    closeDialog().within(() => {
      cy.contains(`Fechar conta da mesa ${TABLE_NUMBER}`).should('be.visible');
      cy.contains('button', 'Fechar conta').should('be.disabled');
      cy.contains('label', PIX.label).click();
      cy.contains('button', 'Fechar conta').should('be.enabled').click();
    });

    // The chip the manager tapped is a label; what the api was handed is the
    // value behind it, and that is what the payload witnesses.
    cy.wait('@closeOrder').then(({ request }) => {
      expect(request.body.paymentType).to.equal(PIX.value);
    });

    cy.location('pathname').should('equal', '/waiter/tables');
    tableCard(TABLE_NUMBER).within(() => {
      cy.contains('Livre').should('be.visible');
    });
  });

  it('refuses the close while an item is still in preparation', () => {
    apiLogin(SEEDED_USERS.manager).then((manager) =>
      seedOrder(manager, [PIZZA]),
    );

    cy.loginAs(SEEDED_USERS.manager);
    openOrderFromFloor(TABLE_NUMBER);

    // The gate is on the screen, not only on the api: the action is disabled
    // and the sentence beside it says why, so the refusal never has to come
    // back as an error.
    summaryCard(TABLE_NUMBER).within(() => {
      cy.contains('Ainda há itens em preparação').should('be.visible');
      cy.contains('button', 'Fechar conta').should('be.disabled');
    });

    // Cancelling is the cleanup, not part of the journey: an item still in
    // preparation cannot be cancelled on its own, and the whole order takes
    // the line out of the kitchen's queue with it — which is what leaves the
    // table free for the next test.
    cancelOpenOrder(TABLE_NUMBER);

    cy.location('pathname').should('equal', '/waiter/tables');
    tableCard(TABLE_NUMBER).within(() => {
      cy.contains('Livre').should('be.visible');
    });
  });

  it('closes the order once every item has left the kitchen', () => {
    apiLogin(SEEDED_USERS.manager).then((manager) =>
      seedOrder(manager, [PIZZA, WATER]).then((orderId) =>
        prepareOrderAsCook(orderId),
      ),
    );

    cy.loginAs(SEEDED_USERS.manager);
    openOrderFromFloor(TABLE_NUMBER);

    summaryCard(TABLE_NUMBER).within(() => {
      cy.contains('Ainda há itens em preparação').should('not.exist');
      cy.contains('button', 'Fechar conta').should('be.enabled').click();
    });

    cy.intercept('POST', '**/orders/*/close').as('closeOrder');
    closeDialog().within(() => {
      cy.contains('label', CASH.label).click();
      cy.contains('button', 'Fechar conta').should('be.enabled').click();
    });

    cy.wait('@closeOrder').then(({ request }) => {
      expect(request.body.paymentType).to.equal(CASH.value);
    });

    cy.location('pathname').should('equal', '/waiter/tables');
    tableCard(TABLE_NUMBER).within(() => {
      cy.contains('Livre').should('be.visible');
    });
  });
});
