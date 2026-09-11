// Journeys from features/07_manager_profile.feature.
//
// The report prints figures for the day, and the day is not this spec's: one
// database serves the whole run, the specs may run in any order, and every one
// of them leaves orders behind. So no total is pinned here. Each figure is read
// back from the endpoints the screen itself reads — /reports/daily-earnings and
// /reports/daily-sales, over HTTP with the manager's own token — and every
// assertion compares what the screen drew against what the backend says at that
// moment. That is the technique this file is built on: it stays true whatever
// the rest of the run left on the day, and it fails the moment the screen and
// the endpoint disagree.
//
// The other half of it is a sale of this spec's own, because identity is the
// one thing the endpoint cannot supply — "this card is the one I seeded", "the
// order I opened is not in the list". Each test seeds a delivered delivery
// order and asserts against it, while every value asserted still comes from the
// read. Delivery is not a detail: a local sale would have to be closed with a
// payment and would occupy a table, and a table that ever had an order can
// never come off the floor (api tables/application/use-cases/delete-table.ts
// refuses it), so a local fixture would leave both a paid sale and a dead table
// behind — on a floor whose seeded numbers belong to the other specs. A
// delivery order needs no table, so it leaves the day exactly one new thing: a
// sale.
import { apiOrigin, SEEDED_USERS } from '../support/accounts';
import {
  addItem,
  apiLogin,
  listTables,
  menuItemId,
  openTableOrder,
  type ISeededSession,
} from '../support/api';

// The screen's own words, each one read from the source under
// src/pages/manager/ rather than guessed at.
const REPORT_PATH = '/reports/daily-earnings';
const REPORT_TITLE = 'Relatório de Ganhos Diários';
const SALES_HEADING = 'Vendas do Dia';
const NO_SALES = 'Nenhuma venda…';
const TOTAL_DAY_LABEL = 'Total do dia';
// The label/value pair a sale card prints where a delivery sale has no payment
// method, and where a sale has no waiter on record.
const DASH = '—';
// lib/catalog.ts — a line whose item has left the menu is labelled with this.
const REMOVED_ITEM_LABEL = 'Item removido do cardápio';

// The three chip groups, as their aria-labels name them. The chips themselves
// carry a label and, behind it, the value the filter compares against.
const TYPE_GROUP = 'Tipo de venda';
const PAYMENT_GROUP = 'Forma de pagamento';
const CATEGORY_GROUP = 'Categoria';
const ALL_CHIP = 'Todos';

// The two order types: the wire values are EOrderType's (api
// orders/domain/enums/order-type.ts) — the create call and the report's own
// type filter both carry one — and the labels are what the manager screens
// print for them (business/labels.ts).
const ORDER_TYPE_LOCAL = 'Local';
const ORDER_TYPE_DELIVERY = 'Delivery';
const LOCAL_LABEL = 'Local';
const DELIVERY_LABEL = 'Entrega';

const TYPE_LABELS: Record<string, string> = {
  [ORDER_TYPE_LOCAL]: LOCAL_LABEL,
  [ORDER_TYPE_DELIVERY]: DELIVERY_LABEL,
};

// lib/payment-labels.ts and lib/catalog.ts — a chip's two sides: the filter
// compares the wire value, and the chip and the sale card print the label. They
// coincide for Pix, and both are named here because the filter reads one while
// the assertions read the other.
const PIX = { value: 'Pix', label: 'Pix' } as const;
const DRINKS = { value: 'DRINK', label: 'Bebidas' } as const;

const PAYMENT_LABELS: Record<string, string> = {
  Cash: 'Dinheiro',
  CreditCard: 'Cartão',
  Pix: 'Pix',
};

const EARNINGS_ENDPOINT = '/reports/daily-earnings';
const DAY_SALES_ENDPOINT = '/reports/daily-sales';

// One fixture customer per name, so an order this spec left says which spec
// left it — every listing in the suite carries the day's orders.
const SALE_CUSTOMER = 'Teste E2E Relatório Venda';
const OPEN_CUSTOMER = 'Teste E2E Relatório Aberto';
const CANCELLED_CUSTOMER = 'Teste E2E Relatório Cancelado';

// A drink: it needs no table, no kitchen pass and no ingredient of anyone
// else's, and three of them make the sale this spec seeded recognisable in the
// card it asserts.
const SALE_ITEM = 'Suco Natural';
const SALE_QUANTITY = 3;

const DELIVERY_PHONE = '(81) 98888-0002';
const DELIVERY_ADDRESS = 'Rua das Mangueiras, 45';

// Open -> Preparing -> Out for delivery -> Delivered: the delivery cycle the
// status route walks one step at a time (api update-delivery-order-status.ts).
const DELIVERY_STEPS = ['Preparing', 'Out for delivery', 'Delivered'] as const;

// The wire shapes of the two report reads, as the manager's token sees them
// (src/pages/manager/api/reports.api.ts and daily-sales.api.ts, plus the
// catalog the sale lines are joined to). Only the fields this spec reads are
// declared — it parses none of them, it reads them back.
interface IEarningsReport {
  grandTotal: number;
  localTotal: number;
  deliveryTotal: number;
}

interface IDaySaleLine {
  itemId: string;
  quantity: number;
}

interface IDaySale {
  id: string;
  waiterName: string | null;
  type: string;
  paymentType: string | null;
  // The table a local sale was rung on, as the wire names it: an id, never the
  // number a card prints. The number comes from the floor listing below.
  tableId?: string;
  createdAt: string;
  closedAt: string | null;
  deliveredAt: string | null;
  totalPrice: number;
  items: IDaySaleLine[];
}

// GET /tables, as the screen's own useTables reads it (api/tables.api.ts).
interface ITableRow {
  id: string;
  number: number;
  openOrder: { orderId: string; totalPrice: number } | null;
}

interface IMenuItemRow {
  id: string;
  name: string;
  category: string;
}

interface IReportDay {
  report: IEarningsReport;
  sales: IDaySale[];
  menu: IMenuItemRow[];
  tables: ITableRow[];
}

interface IFixtures {
  saleOrderId: string;
  openOrderId: string;
  cancelledOrderId: string;
}

interface ITotalCard {
  label: string;
  value: number;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function readEarnings(token: string): Cypress.Chainable<IEarningsReport> {
  return cy
    .request<IEarningsReport>({
      method: 'GET',
      url: `${apiOrigin()}${EARNINGS_ENDPOINT}`,
      headers: bearer(token),
    })
    .its('body');
}

function readDaySales(token: string): Cypress.Chainable<IDaySale[]> {
  return cy
    .request<IDaySale[]>({
      method: 'GET',
      url: `${apiOrigin()}${DAY_SALES_ENDPOINT}`,
      headers: bearer(token),
    })
    .its('body');
}

function readTables(token: string): Cypress.Chainable<ITableRow[]> {
  return listTables(token);
}

function readMenu(token: string): Cypress.Chainable<IMenuItemRow[]> {
  return cy
    .request<IMenuItemRow[]>({
      method: 'GET',
      url: `${apiOrigin()}/items`,
      headers: bearer(token),
    })
    .its('body');
}

// The screen's three reads — the report, the day's sales, the catalog the lines
// are joined to and the floor the table numbers come from — the whole
// expectation for a rendered report, taken in one place.
function readReportDay(token: string): Cypress.Chainable<IReportDay> {
  return readEarnings(token).then((report) =>
    readDaySales(token).then((sales) =>
      readMenu(token).then((menu) =>
        readTables(token).then((tables) => ({ report, sales, menu, tables })),
      ),
    ),
  );
}

// POST /orders for a delivery — the one order that carries a customer instead
// of a table, and so the one this spec can create without touching the floor.
function openDeliveryOrder(
  manager: ISeededSession,
  customerName: string,
): Cypress.Chainable<string> {
  return cy
    .request<{ id: string }>({
      method: 'POST',
      url: `${apiOrigin()}/orders`,
      headers: bearer(manager.token),
      body: {
        userId: manager.userId,
        type: ORDER_TYPE_DELIVERY,
        customerName,
        phone: DELIVERY_PHONE,
        address: DELIVERY_ADDRESS,
      },
    })
    .then((response) => response.body.id);
}

function addSaleLine(
  manager: ISeededSession,
  orderId: string,
): Cypress.Chainable<void> {
  return menuItemId(manager.token, SALE_ITEM).then((itemId) =>
    addItem(manager.token, orderId, itemId, { quantity: SALE_QUANTITY }),
  );
}

function advanceDelivery(
  manager: ISeededSession,
  orderId: string,
  status: string,
): Cypress.Chainable<void> {
  return cy
    .request<void>({
      method: 'PATCH',
      url: `${apiOrigin()}/orders/${orderId}/status`,
      headers: bearer(manager.token),
      body: { status },
    })
    .then(() => cy.wrap<void>(undefined));
}

// The whole cycle, so the order's deliveredAt is what dates the sale.
function deliverOrder(
  manager: ISeededSession,
  orderId: string,
): Cypress.Chainable<void> {
  return cy
    .wrap([...DELIVERY_STEPS], { log: false })
    .each((status: string) => {
      advanceDelivery(manager, orderId, status);
    })
    .then(() => cy.wrap<void>(undefined));
}

function cancelOrder(
  manager: ISeededSession,
  orderId: string,
): Cypress.Chainable<void> {
  return cy
    .request<void>({
      method: 'POST',
      url: `${apiOrigin()}/orders/${orderId}/cancellation`,
      headers: bearer(manager.token),
      body: {},
    })
    .then(() => cy.wrap<void>(undefined));
}

function closeOrder(
  manager: ISeededSession,
  orderId: string,
  paymentType: string,
): Cypress.Chainable<void> {
  return cy
    .request<void>({
      method: 'POST',
      url: `${apiOrigin()}/orders/${orderId}/close`,
      headers: bearer(manager.token),
      body: { paymentType },
    })
    .then(() => cy.wrap<void>(undefined));
}

// A sale of this spec's own: an order of one known item, delivered, so the day
// holds something the spec can name while the endpoint still supplies its
// figures.
function seedSoldDeliveryOrder(
  manager: ISeededSession,
): Cypress.Chainable<string> {
  return openDeliveryOrder(manager, SALE_CUSTOMER).then((orderId) =>
    addSaleLine(manager, orderId)
      .then(() => deliverOrder(manager, orderId))
      .then(() => orderId),
  );
}

// The local counterpart of the fixture above, and the only one that carries a
// table. It takes a table that is free at that moment rather than a fixed
// number, because the seeded floor is shared: the numbers the other specs drive
// belong to them, and a sale rung on one of those would either collide with the
// order they have open or vacate a table under them.
//
// The item is a drink on purpose — it needs no preparation, so the close is not
// refused for an item still in the kitchen, and the fixture costs no cook step.
function seedSoldTableOrder(
  manager: ISeededSession,
): Cypress.Chainable<string> {
  return listTables(manager.token).then((tables) => {
    const free = tables.find((table) => table.openOrder === null);
    if (!free) {
      throw new Error('Every table on the floor is occupied');
    }
    return openTableOrder(manager, free.number).then((orderId) =>
      menuItemId(manager.token, SALE_ITEM).then((itemId) =>
        addItem(manager.token, orderId, itemId, {
          quantity: SALE_QUANTITY,
        }).then(() =>
          closeOrder(manager, orderId, PIX.value).then(() => orderId),
        ),
      ),
    );
  });
}

// The two orders that never become sales: one still open when the report is
// read, one cancelled. Both are item-less, so neither reaches the kitchen.
function seedIncompleteOrders(
  manager: ISeededSession,
): Cypress.Chainable<Omit<IFixtures, 'saleOrderId'>> {
  return openDeliveryOrder(manager, OPEN_CUSTOMER).then((openOrderId) =>
    openDeliveryOrder(manager, CANCELLED_CUSTOMER).then((cancelledOrderId) =>
      cancelOrder(manager, cancelledOrderId).then(() => ({
        openOrderId,
        cancelledOrderId,
      })),
    ),
  );
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function paymentLabel(payment: string): string {
  return PAYMENT_LABELS[payment] ?? payment;
}

// business/filter-sales.ts — a sale's time is the close time for a local sale
// and the delivery time for a delivery sale; the two never both exist.
function saleTimeOf(sale: IDaySale): string {
  return sale.closedAt ?? sale.deliveredAt ?? '';
}

function newestFirst(sales: readonly IDaySale[]): IDaySale[] {
  return [...sales].sort(
    (left, right) =>
      new Date(saleTimeOf(right)).getTime() -
      new Date(saleTimeOf(left)).getTime(),
  );
}

function firstSale(sales: readonly IDaySale[]): IDaySale {
  const [first] = sales;
  if (!first) {
    throw new Error('The day holds no sale to assert');
  }
  return first;
}

function salesOfType(sales: readonly IDaySale[], type: string): IDaySale[] {
  return sales.filter((sale) => sale.type === type);
}

// A delivery sale carries no payment method, so it never matches a payment
// filter — the same rule the screen's own predicate states.
function salesPaidWith(
  sales: readonly IDaySale[],
  payment: string,
): IDaySale[] {
  return sales.filter((sale) => sale.paymentType === payment);
}

// The screen joins the day's lines to the catalog before it filters them
// (business/enrich-sales.ts), so the spec does the same join: a sale belongs to
// the category when one of its lines resolves to it through the menu.
function salesWithCategory(
  day: IReportDay,
  sales: readonly IDaySale[],
  category: string,
): IDaySale[] {
  const categoryByItemId = new Map(
    day.menu.map((item) => [item.id, item.category]),
  );
  return sales.filter((sale) =>
    sale.items.some((line) => categoryByItemId.get(line.itemId) === category),
  );
}

function itemNameOf(day: IReportDay, itemId: string): string {
  return (
    day.menu.find((item) => item.id === itemId)?.name ?? REMOVED_ITEM_LABEL
  );
}

// The table label every local card should print, rebuilt the way the screen
// builds it (business/enrich-sales.ts): the sale names its table by id, and the
// number comes from the floor listing. A sale whose table is not on the floor
// any more resolves to nothing and the card prints no table at all — so a card
// that fell back to the id, or invented a number, disagrees with this list.
function expectedTableLabels(day: IReportDay): string[] {
  const numberById = new Map(
    day.tables.map((table) => [table.id, table.number]),
  );
  return day.sales
    .filter((sale) => sale.type === ORDER_TYPE_LOCAL)
    .map((sale) =>
      sale.tableId === undefined
        ? null
        : (numberById.get(sale.tableId) ?? null),
    )
    .filter((number): number is number => number !== null)
    .map((number) => `Mesa ${number}`);
}

// Every "Mesa N" the cards actually printed. Read off the spans rather than the
// card text, so a label that happens to sit inside a longer string is not
// counted as one.
function printedTableLabels(): Cypress.Chainable<string[]> {
  return saleCards().then(($cards) =>
    $cards
      .toArray()
      .flatMap((card) =>
        Array.from(card.querySelectorAll('span')).map((span) =>
          (span.textContent ?? '').trim(),
        ),
      )
      .filter((text) => text.startsWith('Mesa ')),
  );
}

// The screen prints money through formatBRL (lib/format.ts), a pt-BR currency
// whose space is a non-breaking one — so the spec reads the digits back instead
// of pinning the rendering, and compares a number against a number.
function parseBRL(text: string): number {
  const digits = text.replace(/[^\d,]/g, '').replace(',', '.');
  return text.includes('R$') && digits !== '' ? Number(digits) : Number.NaN;
}

// Mirrors formatTime (lib/format.ts): the same instant through the same pt-BR
// clock, in the same browser the screen rendered it in.
function clockTime(instant: string): string {
  return new Date(instant).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// The money is the paragraph that carries the currency, never simply the first
// one: a totals card draws its label in the paragraph above the value
// (daily-earnings-page.tsx reportTotals), and a sale card's own label is the
// type tag in its header row, which is a span.
function cardTotal(card: HTMLElement): number {
  const money = Array.from(card.querySelectorAll('p')).find((entry) =>
    (entry.textContent ?? '').includes('R$'),
  );
  return parseBRL(money?.textContent ?? '');
}

// The type tag is the first span of a card's header row (SaleCard).
function cardTag(card: HTMLElement): string {
  return card.querySelector('span')?.textContent?.trim() ?? '';
}

// The totals row is the only place on this screen that prints a card whose
// label is one of the report's own (daily-earnings-page.tsx reportTotals), and
// the skeleton that stands in for the report draws none of them.
const TOTAL_LABELS = /^(Total do dia|Local|Entrega)$/;

function totalsGrid(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains('main p', TOTAL_LABELS).parent().parent();
}

function waitForTotals(): void {
  cy.contains('main p', TOTAL_LABELS).should('be.visible');
}

// SaleCard is the app's only <article>, so the day's list is every article
// under the shell's <main>. A `find` on an existing subject yields an empty set
// where a `get` would fail, which is what makes an empty day assertable.
function saleCards(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('main').find('article');
}

function newestCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return saleCards().first();
}

function dayTotals(report: IEarningsReport): ITotalCard[] {
  return [
    { label: TOTAL_DAY_LABEL, value: report.grandTotal },
    { label: TYPE_LABELS[ORDER_TYPE_LOCAL], value: report.localTotal },
    { label: TYPE_LABELS[ORDER_TYPE_DELIVERY], value: report.deliveryTotal },
  ];
}

// One assertion for the whole row: the number of cards is the number of the
// filters' state — which is what makes it a gate as well as a check, since a
// count is only meaningful once the real report is up and the skeleton is not.
function expectTotals(expected: readonly ITotalCard[]): void {
  totalsGrid()
    .find('.card')
    .should(($cards) => {
      const rendered = $cards.toArray().map((card) => ({
        label: card.querySelector('p')?.textContent?.trim() ?? '',
        value: cardTotal(card),
      }));
      expect(rendered).to.deep.equal([...expected]);
    });
}

// The list the screen is showing is exactly these sales, in the order the
// screen's own sort puts them — and a day narrowed to nothing says so instead
// of drawing an empty list. The empty sentence is read off <main>, which always
// exists, so nothing here depends on a query failing to be right.
function expectSalesListed(sales: readonly IDaySale[]): void {
  waitForTotals();
  const totals = newestFirst(sales).map((sale) => sale.totalPrice);
  saleCards().should(($cards) => {
    expect($cards.toArray().map((card) => cardTotal(card))).to.deep.equal(
      totals,
    );
  });
  cy.get('main').should(($main) => {
    if (totals.length === 0) {
      expect($main.text()).to.include(NO_SALES);
      return;
    }
    expect($main.text()).to.not.include(NO_SALES);
  });
}

// Every card carries the value the list was narrowed to — the check a count
// alone cannot make, since a chip that did nothing would leave the unfiltered
// list standing and the numbers would only agree by coincidence.
function expectEveryCardToCarry(text: string): void {
  saleCards().should(($cards) => {
    $cards.toArray().forEach((card) => {
      expect(card.textContent ?? '').to.include(text);
    });
  });
}

// The bug this guards: a sale carries its table as a uuid, and the card used to
// print it verbatim — "Mesa 6c18a6fa-…". Nothing on the screen may carry a table
// id, in the label or anywhere else.
function expectNoTableIdPrinted(day: IReportDay): void {
  const ids = day.sales
    .map((sale) => sale.tableId)
    .filter((id): id is string => id !== undefined);
  saleCards().should(($cards) => {
    $cards.toArray().forEach((card) => {
      ids.forEach((id) => {
        expect(card.textContent ?? '').to.not.include(id);
      });
    });
  });
}

function expectEveryCardTagged(tag: string): void {
  saleCards().should(($cards) => {
    $cards.toArray().forEach((card) => {
      expect(cardTag(card)).to.equal(tag);
    });
  });
}

// The newest card, asserted whole: its type tag, its payment (or the dash a
// delivery sale prints), its sale time, its total, the waiter the day credits
// it to and every line it holds. Every value comes from the read above; none of
// them is written down here.
function expectNewestCard(day: IReportDay, sale: IDaySale): void {
  newestCard().should(($card) => {
    const card = $card[0];
    const text = card.textContent ?? '';
    expect(cardTag(card)).to.equal(typeLabel(sale.type));
    expect(text).to.include(
      sale.paymentType === null ? DASH : paymentLabel(sale.paymentType),
    );
    expect(text).to.include(clockTime(saleTimeOf(sale)));
    expect(cardTotal(card)).to.equal(sale.totalPrice);
    expect(text).to.include(sale.waiterName ?? DASH);
    sale.items.forEach((line) => {
      expect(text).to.include(
        `${line.quantity}× ${itemNameOf(day, line.itemId)}`,
      );
    });
  });
}

// A chip is found inside its own group: "Todos" names three chips on the
// screen, and "Entrega" is also the tag every delivery card carries.
function chip(
  group: string,
  label: string,
): Cypress.Chainable<JQuery<HTMLButtonElement>> {
  return cy
    .get(`[role="group"][aria-label="${group}"]`)
    .contains('button', label);
}

// The chip is a toggle (components/Chip carries aria-pressed), so a click is
// only complete once the control says it is the selected one.
function clickChip(group: string, label: string): void {
  chip(group, label).click();
  chip(group, label).should('have.attr', 'aria-pressed', 'true');
}

describe('Manager daily report', () => {
  it("lists the day's sales newest first and leaves the open and cancelled orders out", () => {
    apiLogin(SEEDED_USERS.manager).as('manager');

    cy.get<ISeededSession>('@manager')
      .then((manager) =>
        seedSoldDeliveryOrder(manager).then((saleOrderId) =>
          seedIncompleteOrders(manager).then((incomplete) => ({
            saleOrderId,
            ...incomplete,
          })),
        ),
      )
      .as('fixtures');

    cy.loginAs(SEEDED_USERS.manager);
    cy.visit(REPORT_PATH);
    cy.contains('h1', REPORT_TITLE).should('be.visible');

    // Read after the screen has drawn, so the comparison is against what the
    // backend says now — which is what the screen is claiming to show.
    cy.get<ISeededSession>('@manager')
      .then((manager) => readReportDay(manager.token))
      .as('day');

    cy.get<IReportDay>('@day').then((day) => {
      cy.get<IFixtures>('@fixtures').then((fixtures) => {
        // The two orders that never completed are in the day by construction,
        // and the endpoint is where the rule that keeps them out lives — so its
        // listing is what says they stayed out of the sale list.
        const ids = day.sales.map((sale) => sale.id);
        expect(ids).to.include(fixtures.saleOrderId);
        expect(ids).to.not.include(fixtures.openOrderId);
        expect(ids).to.not.include(fixtures.cancelledOrderId);

        cy.contains('h2', SALES_HEADING).should('be.visible');
        expectTotals(dayTotals(day.report));
        expectSalesListed(day.sales);

        // The spec's own sale is the day's newest — nothing writes between the
        // seeding above and this read, and the suite runs one spec at a time —
        // so the list's first card is the one it seeded, down to its waiter,
        // its time, its total and its lines.
        const newest = firstSale(newestFirst(day.sales));
        expect(newest.id).to.equal(fixtures.saleOrderId);
        expectNewestCard(day, newest);
      });
    });
  });

  it('narrows the list and the totals by sale type', () => {
    apiLogin(SEEDED_USERS.manager).as('manager');

    cy.get<ISeededSession>('@manager')
      .then((manager) => seedSoldDeliveryOrder(manager))
      .as('saleOrderId');

    cy.loginAs(SEEDED_USERS.manager);
    cy.visit(REPORT_PATH);
    cy.contains('h1', REPORT_TITLE).should('be.visible');

    cy.get<ISeededSession>('@manager')
      .then((manager) => readReportDay(manager.token))
      .as('day');

    cy.get<IReportDay>('@day').then((day) => {
      // The fixture holds the delivery side of the day open, so the chip's
      // assertions below are never the empty list passing by default.
      cy.get<string>('@saleOrderId').then((saleOrderId) => {
        expect(
          salesOfType(day.sales, ORDER_TYPE_DELIVERY).map((sale) => sale.id),
        ).to.include(saleOrderId);
      });

      expectTotals(dayTotals(day.report));
      expectSalesListed(day.sales);

      // The type chip is the report's own scope, so the totals follow it: the
      // one card left is the day's delivery subtotal, and the list is exactly
      // the day's delivery sales.
      clickChip(TYPE_GROUP, DELIVERY_LABEL);
      expectTotals([
        { label: DELIVERY_LABEL, value: day.report.deliveryTotal },
      ]);
      expectSalesListed(salesOfType(day.sales, ORDER_TYPE_DELIVERY));
      expectEveryCardTagged(DELIVERY_LABEL);

      clickChip(TYPE_GROUP, LOCAL_LABEL);
      expectTotals([{ label: LOCAL_LABEL, value: day.report.localTotal }]);
      expectSalesListed(salesOfType(day.sales, ORDER_TYPE_LOCAL));
      expectEveryCardTagged(LOCAL_LABEL);

      // Clearing the chip puts the day back together.
      clickChip(TYPE_GROUP, ALL_CHIP);
      expectTotals(dayTotals(day.report));
      expectSalesListed(day.sales);
    });
  });

  it('narrows the list by payment type and category, and leaves the totals whole', () => {
    apiLogin(SEEDED_USERS.manager).as('manager');

    cy.get<ISeededSession>('@manager')
      .then((manager) => seedSoldDeliveryOrder(manager))
      .as('saleOrderId');

    cy.loginAs(SEEDED_USERS.manager);
    cy.visit(REPORT_PATH);
    cy.contains('h1', REPORT_TITLE).should('be.visible');

    cy.get<ISeededSession>('@manager')
      .then((manager) => readReportDay(manager.token))
      .as('day');

    cy.get<IReportDay>('@day').then((day) => {
      expectTotals(dayTotals(day.report));
      expectSalesListed(day.sales);

      // Payment and category narrow the list and nothing else: the totals keep
      // reporting the whole day while the list below them narrows.
      clickChip(PAYMENT_GROUP, PIX.label);
      expectSalesListed(salesPaidWith(day.sales, PIX.value));
      expectEveryCardToCarry(PIX.label);
      expectTotals(dayTotals(day.report));

      // The two compose: what is left is the Pix sales that also hold a drink.
      clickChip(CATEGORY_GROUP, DRINKS.label);
      expectSalesListed(
        salesWithCategory(
          day,
          salesPaidWith(day.sales, PIX.value),
          DRINKS.value,
        ),
      );
      expectEveryCardToCarry(DRINKS.label);
      expectTotals(dayTotals(day.report));

      // Clearing one leaves the other standing, and clearing both brings the
      // whole day back.
      clickChip(CATEGORY_GROUP, ALL_CHIP);
      expectSalesListed(salesPaidWith(day.sales, PIX.value));

      clickChip(PAYMENT_GROUP, ALL_CHIP);
      expectSalesListed(day.sales);
      expectTotals(dayTotals(day.report));
    });
  });

  it("prints each local sale with the number of its table, never the table's id", () => {
    apiLogin(SEEDED_USERS.manager).as('manager');

    cy.get<ISeededSession>('@manager')
      .then((manager) => seedSoldTableOrder(manager))
      .as('saleOrderId');

    cy.loginAs(SEEDED_USERS.manager);
    cy.visit(REPORT_PATH);
    cy.contains('h1', REPORT_TITLE).should('be.visible');

    cy.get<ISeededSession>('@manager')
      .then((manager) => readReportDay(manager.token))
      .as('day');

    cy.get<IReportDay>('@day').then((day) => {
      // The fixture is in the day by construction — the close is what makes a
      // sale — so the labels below are never an empty list passing by default.
      cy.get<string>('@saleOrderId').then((saleOrderId) => {
        expect(day.sales.map((sale) => sale.id)).to.include(saleOrderId);
      });

      expectSalesListed(day.sales);
      expectNoTableIdPrinted(day);

      // Every label the cards print, against every label the two endpoints say
      // they should: this is the join between the day's sales and the floor, and
      // it is what a card printing an id — or a number no table carries — fails.
      printedTableLabels().should(($printed) => {
        expect([...$printed].sort()).to.deep.equal(
          expectedTableLabels(day).sort(),
        );
      });
      expect(expectedTableLabels(day).length).to.be.greaterThan(0);
    });
  });
});
