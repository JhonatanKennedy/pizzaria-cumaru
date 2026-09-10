import { canIncreaseItemQuantity } from './can-increase-item-quantity';

describe('canIncreaseItemQuantity', () => {
  it('should refuse increasing an item the kitchen has finished', () => {
    expect(canIncreaseItemQuantity('Ready')).toBe(false);
  });

  it('should allow increasing an item still pending or in preparation', () => {
    expect(canIncreaseItemQuantity('Pending')).toBe(true);
    expect(canIncreaseItemQuantity('Preparing')).toBe(true);
  });

  it('should allow increasing an item that never requires preparation', () => {
    expect(canIncreaseItemQuantity(null)).toBe(true);
  });
});
