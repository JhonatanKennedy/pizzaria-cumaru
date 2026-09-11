import { SEED_PASSWORD } from './accounts';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Signs a seeded account in through the real login form. The form is the
       * only way in: the access token lives in a module variable and the refresh
       * token in an httpOnly cookie, so a test cannot assemble a session out of
       * storage — and driving the form is what leaves both halves where the app
       * expects them.
       */
      loginAs(login: string): Chainable<void>;
    }
  }
}

// Deliberately not `cy.session()`. That command works by snapshotting the
// cookies once and replaying them on every restore, and this app rotates its
// refresh token on each use and denylists the spent one — so the first restore
// succeeds and every later one replays a token the backend has already burned,
// getting a 401 and being logged straight back out. Logging in for real is the
// only thing that mints a token the next refresh will accept, and a form login
// per test is what keeps each one independent anyway.
Cypress.Commands.add('loginAs', (login: string) => {
  cy.visit('/login');
  cy.get('#login').clear().type(login);
  cy.get('#password').clear().type(SEED_PASSWORD, { log: false });
  cy.get('button[type="submit"]').click();
  cy.location('pathname').should('not.equal', '/login');
});
