// The item-cancellation request carries no payload: the order history records
// only the item and the cancellation time. The empty class keeps the route's
// body contract explicit (a body, when sent, is whitelisted to nothing).
export class CancelItemDto {}
