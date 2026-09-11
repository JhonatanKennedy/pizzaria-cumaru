// Journeys from features/04_delivery_order.feature.
//
// The SPA makes delivery a manager-only flow — the feature file still casts it
// in the waiter's hands — so every step below is driven through the manager's
// own screens: the day's list, the create dialog, and the order's detail page,
// where a single action per step carries the order to its next status.
//
// A delivery order carries no table, so nothing here can collide with the
// table-based specs. It does, however, reach the day's earnings once delivered,
// which is why both orders are created empty and left unpaid: a total of zero
// keeps this spec out of the figures manager-reports.cy.ts asserts on.
import { SEEDED_USERS } from '../support/accounts';

// One customer per test, and named so a leftover order says which spec left it.
// The suite shares a single database for the whole run, and the day's list
// carries every delivery order every spec has created.
const LISTED_CUSTOMER = 'Teste E2E Nivaldo Reis';
const CYCLED_CUSTOMER = 'Teste E2E Marlene Duarte';

const PHONE = '(81) 98888-0001';
const ADDRESS = 'Rua das Acácias, 120';

// The card's heading, then up to the card itself: h3 > header row > .card.
function deliveryCard(
  customer: string,
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('h3', customer).parent().parent();
}

// The status badge is the h1's sibling in the detail header — the h1 is the
// customer's name, so it is also what scopes the badge to this order's page.
function statusBadge(customer: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('h1', customer).siblings('span');
}

// The detail page's one advance control, named by the step it performs: the
// label is the status the click moves the order to, so a step that skipped a
// status would have no button to press.
function advanceAction(
  label: string,
): Cypress.Chainable<JQuery<HTMLButtonElement>> {
  return cy.contains('button', label);
}

// Creates the order through the dialog and waits for the screen it hands off
// to. The dialog holds no local required rules (delivery-schemas.ts) — an empty
// address is the backend's refusal to make, not the form's — so filling the
// three fields is the whole interaction.
function createDeliveryOrder(customer: string): void {
  cy.contains('button', 'Novo pedido de entrega').click();
  cy.get('[role="dialog"]').within(() => {
    cy.get('#delivery-customer-name').clear().type(customer);
    cy.get('#delivery-phone').clear().type(PHONE);
    cy.get('#delivery-address').clear().type(ADDRESS);
    cy.contains('button', 'Criar pedido').click();
  });
  cy.contains('h1', customer).should('be.visible');
}

describe('Manager delivery orders', () => {
  it('creates a delivery order with a customer, phone and address, and lists it for the day', () => {
    cy.loginAs(SEEDED_USERS.manager);
    cy.visit('/manager/delivery');

    createDeliveryOrder(LISTED_CUSTOMER);

    // The create dialog hands off to the order's own screen, which reads the
    // three fields back — the address is what tells the delivery apart from a
    // table order, since no table was ever picked.
    cy.contains('p', PHONE).should('be.visible');
    cy.contains('p', ADDRESS).should('be.visible');
    statusBadge(LISTED_CUSTOMER).should('have.text', 'Aberta');

    // The back link returns to a listing that knows about the order: the create
    // mutation invalidated the orders query on its way out, and the listing is
    // only fresh for 30s (routes/query-client.ts), so a card here is a card the
    // invalidation reached rather than one the cache already held.
    cy.get('[aria-label="Voltar para Pedidos de entrega"]').click();
    cy.location('pathname').should('equal', '/manager/delivery');

    deliveryCard(LISTED_CUSTOMER).within(() => {
      cy.contains('Aberta').should('be.visible');
      cy.contains(PHONE).should('be.visible');
    });
  });

  it('walks a delivery order through its cycle, one action per step', () => {
    cy.loginAs(SEEDED_USERS.manager);
    cy.visit('/manager/delivery');
    createDeliveryOrder(CYCLED_CUSTOMER);

    statusBadge(CYCLED_CUSTOMER).should('have.text', 'Aberta');
    advanceAction('Iniciar preparo').click();
    statusBadge(CYCLED_CUSTOMER).should('have.text', 'Preparando');
    advanceAction('Saiu para entrega').should('be.visible');

    advanceAction('Saiu para entrega').click();
    statusBadge(CYCLED_CUSTOMER).should('have.text', 'Saiu para entrega');
    advanceAction('Marcar como entregue').should('be.visible');

    advanceAction('Marcar como entregue').click();
    statusBadge(CYCLED_CUSTOMER).should('have.text', 'Entregue');
    // Delivered is the end of the cycle, so the action is gone — and the moment
    // the order finished is recorded on it.
    advanceAction('Marcar como entregue').should('not.exist');
    cy.contains('p', /^Entregue às \d{2}:\d{2}$/).should('be.visible');
  });
});
