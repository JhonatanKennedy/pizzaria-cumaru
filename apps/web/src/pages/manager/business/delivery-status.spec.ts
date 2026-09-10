import {
  DELIVERY_STATUSES,
  DELIVERY_ACTION_LABELS,
  nextDeliveryStatus,
} from './delivery-status';

describe('delivery status helpers', () => {
  it('should advance an order through the delivery cycle', () => {
    expect(nextDeliveryStatus('Open')).toBe('Preparing');
    expect(nextDeliveryStatus('Preparing')).toBe('Out for delivery');
    expect(nextDeliveryStatus('Out for delivery')).toBe('Delivered');
  });

  it('should return null when the order cannot advance further', () => {
    expect(nextDeliveryStatus('Delivered')).toBeNull();
    expect(nextDeliveryStatus('Closed')).toBeNull();
    expect(nextDeliveryStatus('Cancelled')).toBeNull();
    expect(nextDeliveryStatus('Unknown')).toBeNull();
  });

  it('should expose the reachable statuses and one action label per step', () => {
    expect([...DELIVERY_STATUSES]).toEqual([
      'Preparing',
      'Out for delivery',
      'Delivered',
    ]);
    expect(DELIVERY_ACTION_LABELS).toEqual({
      Preparing: 'Iniciar preparo',
      'Out for delivery': 'Saiu para entrega',
      Delivered: 'Marcar como entregue',
    });
  });
});
