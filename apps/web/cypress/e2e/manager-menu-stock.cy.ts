// Journeys from features/02_menu_and_stock.feature.
//
// The menu is the one screen in the suite that writes the catalog, and the
// suite shares a single database — so every test here works on rows it named
// itself (the suffix in SPEC_SUFFIX) and the sweep in afterEach puts the
// catalog back whatever the test did to it. A leaked item changes the counts
// another spec reads; a leaked "unavailable" is worse, because an out-of-stock
// ingredient takes its items out of every other screen, the kitchen queue
// included. The sweep is over HTTP rather than through the UI so that it runs
// on a test that failed halfway through.
import { apiOrigin, SEEDED_USERS } from '../support/accounts';
import { apiLogin } from '../support/api';

const SPEC_SUFFIX = 'E2E';

const PIZZA_BASE_NAME = `Pizza ${SPEC_SUFFIX}`;
const PIZZA_NAME = `${PIZZA_BASE_NAME} G`;
const DRINK_NAME = `Bebida ${SPEC_SUFFIX}`;

const PIZZA_PRICE = 55;
const DRINK_PRICE = 9;

// formatBRL renders a pt-BR currency, whose space is a non-breaking one — the
// pattern takes whichever the browser produced.
const PIZZA_PRICE_TEXT = /R\$\s*55,00/;
const DRINK_PRICE_TEXT = /R\$\s*9,00/;

// The ingredient this spec takes out of stock and puts back, and the two seeded
// rows the flip has to reach: a pizza that carries it, and the one item in the
// catalog with no ingredient links at all.
const INGREDIENT = 'Mussarela';
const DEPENDENT_ITEM = 'Mussarela G';
const INDEPENDENT_ITEM = 'Refrigerante Lata';

const UNAVAILABLE_LABEL = 'Marcar indisponível';
const AVAILABLE_LABEL = 'Marcar disponível';

// The subset of the catalog listing the sweep reads. Both shapes are a few
// fields of the wire contract; the spec parses none of them, it only sweeps.
interface ICatalogItemRow {
  id: string;
  name: string;
}

interface IIngredientRow {
  id: string;
  name: string;
  available: boolean;
}

interface INewItem {
  name: string;
  description: string;
  price: number;
  category?: string;
  size?: string;
  requiresPreparation?: boolean;
  ingredient?: string;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// A chain whose subject nothing reads: the sweep issues its writes for their
// effect, and Cypress types a chain by the subject it carries.
function yieldingNothing<S>(
  subject: Cypress.Chainable<S>,
): Cypress.Chainable<void> {
  return subject.then(() => cy.wrap<void>(undefined));
}

function openMenu(): void {
  cy.visit('/manager/menu');
  cy.contains('h1', 'Cardápio e estoque').should('be.visible');
}

function dialog(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('[role="dialog"]');
}

// The dialog's checkbox labels wrap their input, and neither the preparation
// flag nor the ingredient checkboxes carry an id of their own.
function checkLabel(text: string): void {
  cy.contains('label', text).find('input').check();
}

// A row is named by its th[scope="row"], anchored so that "Mussarela" cannot
// land on the "Mussarela G" row beside it.
function itemRow(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('th[scope="row"]', new RegExp(`^${name}$`)).parent();
}

function searchItems(query: string): void {
  cy.get('#menu-item-search').clear().type(query);
}

function searchIngredients(query: string): void {
  cy.get('#menu-ingredient-search').clear().type(query);
}

function openItemsTab(): void {
  cy.get('#menu-tab-items').click();
}

function openIngredientsTab(): void {
  cy.get('#menu-tab-ingredients').click();
}

// The create button is disabled until the catalog lands — the item form
// pre-checks its ingredients, so a dialog opened over a catalog it never saw
// would offer an empty list.
function openCreateItem(): void {
  cy.contains('button', 'Novo item').should('be.enabled').click();
}

function saveItem(): void {
  cy.contains('button', 'Salvar item').click();
}

function createItem(input: INewItem): void {
  openCreateItem();
  dialog().within(() => {
    cy.get('#item-name').clear().type(input.name);
    cy.get('#item-description').clear().type(input.description);
    cy.get('#item-price').clear().type(String(input.price));
    if (input.category !== undefined) {
      cy.get('#item-category').select(input.category);
    }
    if (input.size !== undefined) {
      cy.get('#item-size').select(input.size);
    }
    if (input.requiresPreparation === true) {
      checkLabel('Exige preparo');
    }
    if (input.ingredient !== undefined) {
      checkLabel(input.ingredient);
    }
    saveItem();
  });
  dialog().should('not.exist');
}

// Every item the spec created carries the suffix in its name, and the catalog
// has no unique constraint to sweep on — so the match is the name.
function removeSpecItems(token: string): Cypress.Chainable<void> {
  return yieldingNothing(
    cy
      .request<ICatalogItemRow[]>({
        method: 'GET',
        url: `${apiOrigin()}/items`,
        headers: bearer(token),
      })
      .its('body')
      .then((items) => items.filter((item) => item.name.includes(SPEC_SUFFIX)))
      .each((item: ICatalogItemRow) => {
        cy.request<void>({
          method: 'DELETE',
          url: `${apiOrigin()}/items/${item.id}`,
          headers: bearer(token),
        });
      }),
  );
}

// The load scenario is expected to restore the ingredient it took out; this is
// what makes that true even when the test gave up before reaching it.
function restockIngredients(token: string): Cypress.Chainable<void> {
  return yieldingNothing(
    cy
      .request<IIngredientRow[]>({
        method: 'GET',
        url: `${apiOrigin()}/ingredients`,
        headers: bearer(token),
      })
      .its('body')
      .then((ingredients) =>
        ingredients.filter((ingredient) => !ingredient.available),
      )
      .each((ingredient: IIngredientRow) => {
        cy.request<void>({
          method: 'PATCH',
          url: `${apiOrigin()}/ingredients/${ingredient.id}/stock`,
          headers: bearer(token),
          body: { available: true },
        });
      }),
  );
}

describe('Manager menu and stock', () => {
  // Deliberately no viewport override: the item form is taller than Cypress's
  // 1000x660 default — a field per attribute plus one checkbox per seeded
  // ingredient — and it must stay reachable there. The dialog scrolls its own
  // overlay, so the submit is a scroll away rather than off the screen, and
  // running at the default size is what proves it.
  afterEach(() => {
    apiLogin(SEEDED_USERS.manager).then((session) =>
      removeSpecItems(session.token).then(() =>
        restockIngredients(session.token),
      ),
    );
  });

  it('registers a pizza with a size and lists it in the items table', () => {
    cy.loginAs(SEEDED_USERS.manager);
    openMenu();

    openCreateItem();
    dialog().within(() => {
      cy.get('#item-name').clear().type(PIZZA_BASE_NAME);
      cy.get('#item-description').clear().type('Pizza do teste de cardápio');
      cy.get('#item-price').clear().type(String(PIZZA_PRICE));
      cy.get('#item-size').select('G');
      saveItem();
      // A pizza is a kitchen category: an item without the flag never reaches
      // the kitchen queue, so the form refuses to save it.
      cy.contains('Pizzas e pratos exigem "Exige preparo"').should(
        'be.visible',
      );
    });

    dialog().within(() => {
      checkLabel('Exige preparo');
      saveItem();
    });
    dialog().should('not.exist');

    // The row is found by the name the form wrote — the base and the size as
    // the catalog spells a sized pizza.
    searchItems(PIZZA_NAME);
    itemRow(PIZZA_NAME).within(() => {
      cy.contains('td', 'Pizzas').should('be.visible');
      cy.contains('td', PIZZA_PRICE_TEXT).should('be.visible');
      cy.contains('Indisponível').should('not.exist');
    });
  });

  it('offers the size for a pizza only, and saves a drink without one', () => {
    cy.loginAs(SEEDED_USERS.manager);
    openMenu();

    openCreateItem();
    dialog().within(() => {
      // The form opens on Pizzas, so the selector and its hint are there.
      cy.get('#item-size').should('be.visible');
      cy.contains('Sem tamanho a pizza pode ser pedida inteira').should(
        'be.visible',
      );

      cy.get('#item-category').select('DRINK');
      cy.get('#item-size').should('not.exist');
      cy.contains('Sem tamanho a pizza pode ser pedida inteira').should(
        'not.exist',
      );

      cy.get('#item-name').clear().type(DRINK_NAME);
      cy.get('#item-description').clear().type('Bebida do teste de cardápio');
      cy.get('#item-price').clear().type(String(DRINK_PRICE));
      saveItem();
    });
    dialog().should('not.exist');

    // The row is found by the drink's name and nothing else: had a size token
    // ridden along from the unmounted selector, the name would not match.
    searchItems(DRINK_NAME);
    itemRow(DRINK_NAME).within(() => {
      cy.contains('td', 'Bebidas').should('be.visible');
      cy.contains('td', DRINK_PRICE_TEXT).should('be.visible');
      cy.contains('Indisponível').should('not.exist');
    });
  });

  it('pre-selects the size a pizza being edited already carries', () => {
    cy.loginAs(SEEDED_USERS.manager);
    openMenu();

    createItem({
      name: PIZZA_BASE_NAME,
      description: 'Pizza do teste de cardápio',
      price: PIZZA_PRICE,
      size: 'G',
      requiresPreparation: true,
    });

    searchItems(PIZZA_NAME);
    cy.get(`button[aria-label="Editar ${PIZZA_NAME}"]`).click();
    dialog().within(() => {
      cy.contains(`Editar ${PIZZA_NAME}`).should('be.visible');
      // The name field carries the base and the selector carries the size —
      // the two halves the form put together on the way in.
      cy.get('#item-name').should('have.value', PIZZA_BASE_NAME);
      cy.get('#item-size').should('have.value', 'G');
      // The category belongs to the item being edited and cannot be moved.
      cy.get('#item-category').should('have.value', 'PIZZA');
      cy.get('#item-category').should('be.disabled');
      cy.contains('button', 'Cancelar').click();
    });
    dialog().should('not.exist');
  });

  it('takes the items that depend on an ingredient off the menu, and puts them back', () => {
    cy.loginAs(SEEDED_USERS.manager);
    openMenu();

    // A pizza of this spec's own, linked to the ingredient, so one of the rows
    // that goes unavailable is a row the spec built.
    createItem({
      name: PIZZA_BASE_NAME,
      description: 'Pizza do teste de cardápio',
      price: PIZZA_PRICE,
      size: 'G',
      requiresPreparation: true,
      ingredient: INGREDIENT,
    });

    openIngredientsTab();
    searchIngredients(INGREDIENT);
    cy.get(`button[aria-label="${UNAVAILABLE_LABEL}: ${INGREDIENT}"]`).click();
    // The row's own control flips once the listing comes back, which is the
    // same read the item list below is refetched by.
    cy.get(`button[aria-label="${AVAILABLE_LABEL}: ${INGREDIENT}"]`).should(
      'be.visible',
    );

    openItemsTab();
    searchItems(PIZZA_NAME);
    itemRow(PIZZA_NAME).within(() => {
      cy.contains('Indisponível').should('be.visible');
    });
    searchItems(DEPENDENT_ITEM);
    itemRow(DEPENDENT_ITEM).within(() => {
      cy.contains('Indisponível').should('be.visible');
    });
    searchItems(INDEPENDENT_ITEM);
    itemRow(INDEPENDENT_ITEM).within(() => {
      cy.contains('Indisponível').should('not.exist');
    });

    openIngredientsTab();
    searchIngredients(INGREDIENT);
    cy.get(`button[aria-label="${AVAILABLE_LABEL}: ${INGREDIENT}"]`).click();
    cy.get(`button[aria-label="${UNAVAILABLE_LABEL}: ${INGREDIENT}"]`).should(
      'be.visible',
    );

    openItemsTab();
    searchItems(PIZZA_NAME);
    itemRow(PIZZA_NAME).within(() => {
      cy.contains('Indisponível').should('not.exist');
    });
    searchItems(DEPENDENT_ITEM);
    itemRow(DEPENDENT_ITEM).within(() => {
      cy.contains('Indisponível').should('not.exist');
    });
  });
});
