// HTTP seeding for journeys.
//
// A journey like "the cook prepares what the waiter ordered, and the manager
// bills it" spans three roles, and Cypress drives one browser. So the role
// whose screen is *not* under test signs in over HTTP and takes its steps
// there, leaving the one screen that matters to be asserted through the UI.
// That is the whole point: the spec proves the UI wiring and the propagation
// between screens, which is the part the api's own e2e suite cannot reach.
import { apiOrigin, SEED_PASSWORD, type ILoginResponse } from './accounts';

export interface ISeededSession {
  token: string;
  userId: number;
}

export interface IFlavorPart {
  name: string;
  pieces: number;
}

export interface IOrderItemRow {
  id: string;
  itemId: string;
  quantity: number;
  status: string | null;
  unitPrice: number;
  parts: IFlavorPart[];
}

export interface IOrderRow {
  id: string;
  type: 'Local' | 'Delivery';
  status: string;
  tableId?: string;
  totalPrice: number;
  customerName?: string;
  address?: string;
  items: IOrderItemRow[];
}

interface IMenuItemEntry {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

interface ITableEntry {
  id: string;
  number: number;
  openOrder: { orderId: string; totalPrice: number } | null;
}

interface IKitchenQueueItem {
  orderItemId: string;
  status: string;
}

interface IKitchenQueueOrder {
  orderId: string;
  items: IKitchenQueueItem[];
}

interface IKitchenQueue {
  delivery: IKitchenQueueOrder[];
  local: IKitchenQueueOrder[];
}

interface IRequestOptions {
  token?: string;
  body?: Cypress.RequestBody;
}

function requestOptions(
  path: string,
  options: IRequestOptions,
): Partial<Cypress.RequestOptions> {
  return {
    url: `${apiOrigin()}${path}`,
    headers: options.token
      ? { Authorization: `Bearer ${options.token}` }
      : undefined,
    body: options.body,
  };
}

// `T` is constrained to an object because of how Cypress types `then`: its
// overloads resolve in declaration order, and only the one that preserves the
// subject's type matches an object-returning callback. An unconstrained
// generic falls through to a conditional type that widens the subject into a
// union, which then no longer fits `Chainable<T>` — so the constraint is what
// makes this signature true rather than decorative.
function request<T extends object>(
  method: Cypress.HttpMethod,
  path: string,
  options: IRequestOptions = {},
): Cypress.Chainable<T> {
  return cy
    .request<T>({ method, ...requestOptions(path, options) })
    .its('body');
}

// A chainable whose subject nothing reads. Cypress types a request by its
// response body and `void` is not a subject it accepts, so the response is
// swapped for the nothing the caller actually gets — which keeps the verbs
// below honest about yielding no body rather than a response nobody wanted.
function yieldsNothing<S>(
  subject: Cypress.Chainable<S>,
): Cypress.Chainable<void> {
  return subject.then(() => cy.wrap<void>(undefined));
}

// A request issued for its effect: the kitchen's verbs and the add-item call
// answer with a body no spec reads.
function send(
  method: Cypress.HttpMethod,
  path: string,
  options: IRequestOptions = {},
): Cypress.Chainable<void> {
  return yieldsNothing(
    cy.request<void>({ method, ...requestOptions(path, options) }),
  );
}

export function apiLogin(login: string): Cypress.Chainable<ISeededSession> {
  return request<ILoginResponse>('POST', '/auth/login', {
    body: { login, password: SEED_PASSWORD },
  }).then((body) => ({ token: body.accessToken, userId: body.user.id }));
}

export function listOrders(token: string): Cypress.Chainable<IOrderRow[]> {
  return request<IOrderRow[]>('GET', '/orders', { token });
}

export function findOrder(
  token: string,
  orderId: string,
): Cypress.Chainable<IOrderRow> {
  return listOrders(token).then((orders) => {
    const found = orders.find((order) => order.id === orderId);
    if (!found) {
      throw new Error(`Order ${orderId} is not in the listing`);
    }
    return found;
  });
}

export function listTables(token: string): Cypress.Chainable<ITableEntry[]> {
  return request<ITableEntry[]>('GET', '/tables', { token });
}

export function menuItemId(
  token: string,
  name: string,
): Cypress.Chainable<string> {
  return request<IMenuItemEntry[]>('GET', '/items', { token }).then((items) => {
    const found = items.find((item) => item.name === name);
    if (!found) {
      throw new Error(`"${name}" is not in the seeded menu`);
    }
    return found.id;
  });
}

export function tableId(
  token: string,
  number: number,
): Cypress.Chainable<string> {
  return listTables(token).then((tables) => {
    const found = tables.find((table) => table.number === number);
    if (!found) {
      throw new Error(`Table ${number} is not in the seeded floor`);
    }
    return found.id;
  });
}

// Opens a table order the way the waiter's floor does, and yields its id.
export function openTableOrder(
  session: ISeededSession,
  tableNumber: number,
): Cypress.Chainable<string> {
  return tableId(session.token, tableNumber).then((id) =>
    request<{ id: string }>('POST', '/orders', {
      token: session.token,
      body: { userId: session.userId, type: 'Local', tableId: id },
    }).then((order) => order.id),
  );
}

export function addItem(
  token: string,
  orderId: string,
  itemId: string,
  options: {
    quantity?: number;
    parts?: IFlavorPart[];
    notes?: string;
  } = {},
): Cypress.Chainable<void> {
  return send('POST', `/orders/${orderId}/items`, {
    token,
    body: { itemId, ...options },
  });
}

// The kitchen drives items through orders' own use-cases, so a spec that needs
// an item "Ready" before asserting a manager's screen goes through these rather
// than through the kitchen UI.
export function startItem(
  token: string,
  orderId: string,
  orderItemId: string,
): Cypress.Chainable<void> {
  return send('POST', `/kitchen/orders/${orderId}/items/${orderItemId}/start`, {
    token,
  });
}

export function finishItem(
  token: string,
  orderId: string,
  orderItemId: string,
): Cypress.Chainable<void> {
  return send(
    'POST',
    `/kitchen/orders/${orderId}/items/${orderItemId}/finish`,
    { token },
  );
}

// Drives every line of an order to Ready, which is the state the close flow
// and the waiter's follow-up both wait for. The order is read through the
// queue rather than the listing because a cook's token reaches the kitchen's
// routes and nothing else — and the queue lists exactly the lines that have a
// preparation to drive. Each line reaches Ready before the next one starts,
// because the two verbs per line are queued in the order they are issued.
export function prepareWholeOrder(
  cookToken: string,
  orderId: string,
): Cypress.Chainable<void> {
  return request<IKitchenQueue>('GET', '/kitchen/queue', {
    token: cookToken,
  }).then((queue) => {
    const queued = [...queue.local, ...queue.delivery].find(
      (entry) => entry.orderId === orderId,
    );
    if (!queued) {
      throw new Error(`Order ${orderId} is not in the kitchen queue`);
    }
    return yieldsNothing(
      cy.wrap(queued.items, { log: false }).each((item: IKitchenQueueItem) => {
        startItem(cookToken, orderId, item.orderItemId);
        finishItem(cookToken, orderId, item.orderItemId);
      }),
    );
  });
}
