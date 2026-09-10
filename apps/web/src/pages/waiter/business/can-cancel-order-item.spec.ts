import { canCancelOrderItem } from './can-cancel-order-item';

describe('canCancelOrderItem', () => {
  it('should allow cancelling an item that never requires preparation', () => {
    expect(canCancelOrderItem(null)).toBe(true);
  });

  it('should allow cancelling a preparation item still pending', () => {
    expect(canCancelOrderItem('Pending')).toBe(true);
  });

  it('should refuse cancelling an item whose preparation started or finished', () => {
    expect(canCancelOrderItem('Preparing')).toBe(false);
    expect(canCancelOrderItem('Ready')).toBe(false);
  });
});
