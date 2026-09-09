import { orderStatusLabel } from './labels';

describe('orderStatusLabel', () => {
  it('should map every known order status to its Portuguese label', () => {
    expect(orderStatusLabel('Open')).toBe('Aberta');
    expect(orderStatusLabel('Closed')).toBe('Fechada');
    expect(orderStatusLabel('Cancelled')).toBe('Cancelado');
    expect(orderStatusLabel('Preparing')).toBe('Preparando');
    expect(orderStatusLabel('Out for delivery')).toBe('Saiu para entrega');
    expect(orderStatusLabel('Delivered')).toBe('Entregue');
  });

  it('should fall back to the raw value for unknown statuses', () => {
    expect(orderStatusLabel('Weird')).toBe('Weird');
  });
});
