// Journeys from features/01_authentication.feature.
//
// The session is two halves — an access token in memory and a refresh token in
// an httpOnly cookie — so the reload and the post-logout reload below are the
// only assertions that can show the refresh half is doing its job.
const PANELS = [
  { login: 'ana.gerente', roleLabel: 'Gerente', home: '/manager' },
  { login: 'joao.garcom', roleLabel: 'Garçom', home: '/waiter/tables' },
  { login: 'carlos.cozinha', roleLabel: 'Cozinheiro', home: '/kitchen' },
] as const;

describe('Authentication', () => {
  PANELS.forEach(({ login, roleLabel, home }) => {
    it(`lands ${login} on their own panel`, () => {
      cy.loginAs(login);

      cy.visit('/');

      cy.location('pathname').should('equal', home);
      cy.contains(roleLabel).should('be.visible');
    });
  });

  it('keeps the session across a reload', () => {
    cy.loginAs('joao.garcom');
    cy.visit('/waiter/tables');

    // A reload empties the in-memory token, so surviving it means the cookie
    // minted a new one.
    cy.reload();

    cy.location('pathname').should('equal', '/waiter/tables');
    cy.contains('joao.garcom').should('exist');
  });

  it('ends the session on logout, and stays ended after a reload', () => {
    cy.loginAs('joao.garcom');
    cy.visit('/waiter/tables');

    cy.contains('button', 'Sair').click();
    cy.location('pathname').should('equal', '/login');

    cy.reload();
    cy.location('pathname').should('equal', '/login');
  });

  it('refuses a waiter the daily earnings report', () => {
    cy.loginAs('joao.garcom');

    cy.visit('/reports/daily-earnings');

    cy.contains('Acesso negado').should('be.visible');
    cy.contains('Acesso não autorizado para o seu perfil').should('be.visible');
  });
});
