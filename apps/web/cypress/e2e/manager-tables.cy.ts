// Journeys from features/10_table_management.feature.
//
// The manager's registry is the screen under test, and everything here goes
// through it: registering a table, giving it a new number, taking it off the
// floor through the confirmation, and the backend's refusal of a number that is
// already taken, which surfaces verbatim.
//
// The floor is shared state — one database serves the whole run, the seed lays
// down tables 1-10, and other specs open orders on them. So every number this
// spec registers is its own, well clear of the seeded range, and comes back out
// before the test ends.
import { SEEDED_USERS } from '../support/accounts';

// One number per test, so a table leaked by a failure cannot collide with the
// next test's own.
const NUMBERS = {
  register: 21,
  duplicate: 22,
  renameFrom: 23,
  renameTo: 24,
  remove: 25,
} as const;

// The row header names the table, so a row is found by the table it holds. The
// pattern is anchored, so "Mesa 23" cannot match a "Mesa 2" row.
function tableRow(number: number): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .contains('th[scope="row"]', new RegExp(`^Mesa ${number}$`))
    .parent();
}

// `cy.contains` fails outright when nothing matches, so it cannot express an
// absence — `tableRow(n).should('not.exist')` times out on the `contains` before
// the assertion ever runs. The row headers are read as a list instead, which a
// retry can re-evaluate once the listing has been refetched.
function expectNoTableRow(number: number): void {
  cy.get('th[scope="row"]').should(($headers) => {
    const labels = $headers
      .toArray()
      .map((header) => header.textContent?.trim() ?? '');
    expect(labels).to.not.include(`Mesa ${number}`);
  });
}

function dialog(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('[role="dialog"]');
}

// The row buttons name their table in the accessible name ("Renumerar Mesa 21")
// while their text is only the verb, so they are found by that name.
function rowAction(
  number: number,
  action: 'Renumerar' | 'Remover',
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`button[aria-label="${action} Mesa ${number}"]`);
}

function openRegisterDialog(number: number): void {
  cy.contains('button', 'Adicionar mesa').click();
  dialog().within(() => {
    cy.get('#table-number').clear().type(String(number));
  });
}

function submitDialog(label: string): void {
  dialog().within(() => {
    cy.contains('button', label).click();
  });
}

// The register dialog closes only once the create has gone through, so leaving
// it is what says the registration was accepted.
function registerTable(number: number): void {
  openRegisterDialog(number);
  submitDialog('Adicionar');
  dialog().should('not.exist');
  tableRow(number).should('be.visible');
}

function removeTable(number: number): void {
  rowAction(number, 'Remover').click();
  dialog().within(() => {
    cy.contains(`A mesa ${number} será removida.`).should('be.visible');
    cy.contains('button', 'Remover').click();
  });
  expectNoTableRow(number);
}

describe('Manager table management', () => {
  it('registers a table and shows it free in the listing', () => {
    cy.loginAs(SEEDED_USERS.manager);
    cy.visit('/manager/tables');

    registerTable(NUMBERS.register);
    tableRow(NUMBERS.register).within(() => {
      cy.contains('Livre').should('be.visible');
    });

    removeTable(NUMBERS.register);
  });

  it('refuses a table number that is already registered', () => {
    cy.loginAs(SEEDED_USERS.manager);
    cy.visit('/manager/tables');

    // The collision is with this test's own table — the one number the spec can
    // know is taken without guessing at the state another test left behind.
    registerTable(NUMBERS.duplicate);

    openRegisterDialog(NUMBERS.duplicate);
    submitDialog('Adicionar');
    dialog().within(() => {
      cy.contains('Table number already exists').should('be.visible');
    });

    // The refused form stays open, so it is closed before the table comes back
    // out of the floor.
    dialog().within(() => {
      cy.contains('button', 'Cancelar').click();
    });
    dialog().should('not.exist');

    removeTable(NUMBERS.duplicate);
  });

  it('renumbers a table and shows the new number in the listing', () => {
    cy.loginAs(SEEDED_USERS.manager);
    cy.visit('/manager/tables');

    registerTable(NUMBERS.renameFrom);

    rowAction(NUMBERS.renameFrom, 'Renumerar').click();
    dialog().within(() => {
      cy.get('#table-number').clear().type(String(NUMBERS.renameTo));
      cy.contains('button', 'Renumerar').click();
    });
    dialog().should('not.exist');

    tableRow(NUMBERS.renameTo).should('be.visible');
    expectNoTableRow(NUMBERS.renameFrom);

    removeTable(NUMBERS.renameTo);
  });

  it('removes a free table through the confirmation', () => {
    cy.loginAs(SEEDED_USERS.manager);
    cy.visit('/manager/tables');

    registerTable(NUMBERS.remove);

    removeTable(NUMBERS.remove);
  });
});
