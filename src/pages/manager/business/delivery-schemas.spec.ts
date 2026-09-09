import {
  addItemFormSchema,
  createDeliveryOrderFormSchema,
} from './delivery-schemas';

describe('createDeliveryOrderFormSchema', () => {
  it('should accept the customer details', () => {
    const result = createDeliveryOrderFormSchema.safeParse({
      customerName: 'Maria Souza',
      phone: '(88) 99999-0000',
      address: 'Rua das Flores, 12',
    });
    expect(result.success).toBe(true);
  });

  it('should accept an empty name and address, leaving rejection to the backend', () => {
    // Product decision: no local required rules — the Gherkin asserts the
    // backend's own messages verbatim, so an empty form surfaces them.
    const result = createDeliveryOrderFormSchema.safeParse({
      customerName: '',
      phone: '',
      address: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('addItemFormSchema', () => {
  it('should accept a quantity with notes', () => {
    const result = addItemFormSchema.safeParse({
      quantity: 2,
      notes: 'Sem cebola',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a quantity below one', () => {
    const result = addItemFormSchema.safeParse({
      quantity: 0,
      notes: '',
    });
    expect(result.success).toBe(false);
  });
});
