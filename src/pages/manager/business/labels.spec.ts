import { orderTypeLabel } from './labels';

describe('orderTypeLabel', () => {
  it('should map each order type to its screen label', () => {
    expect(orderTypeLabel('Local')).toBe('Local');
    expect(orderTypeLabel('Delivery')).toBe('Entrega');
  });

  it('should fall back to the raw value for unknown types', () => {
    expect(orderTypeLabel('Takeout')).toBe('Takeout');
  });
});
