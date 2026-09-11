import { isInKitchen } from './kitchen-item';

describe('isInKitchen', () => {
  it('should report the two statuses the kitchen queue holds', () => {
    expect(isInKitchen('Pending')).toBe(true);
    expect(isInKitchen('Preparing')).toBe(true);
  });

  it('should report a finished item as out of the kitchen', () => {
    expect(isInKitchen('Ready')).toBe(false);
  });

  it('should report an item that never entered the kitchen flow', () => {
    expect(isInKitchen(null)).toBe(false);
  });
});
