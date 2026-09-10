// The order-cancellation request carries no payload: cancellations no longer
// take a reason. The empty class keeps the route's body contract explicit (a
// body, when sent, is whitelisted to nothing).
export class CancelOrderDto {}
