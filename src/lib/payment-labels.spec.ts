import { paymentLabel } from './payment-labels';

describe('paymentLabel', () => {
  it('should map each payment method to its Portuguese label', () => {
    expect(paymentLabel('Cash')).toBe('Dinheiro');
    expect(paymentLabel('CreditCard')).toBe('Cartão');
    expect(paymentLabel('Pix')).toBe('Pix');
  });

  it('should fall back to the raw value for unknown methods', () => {
    expect(paymentLabel('Debit')).toBe('Debit');
  });
});
