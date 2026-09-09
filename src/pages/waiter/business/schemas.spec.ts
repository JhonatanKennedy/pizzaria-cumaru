import { addItemFormSchema, tableOrderFormSchema } from './schemas';

describe('tableOrderFormSchema', () => {
  it('should accept a table number', () => {
    expect(tableOrderFormSchema.safeParse({ tableId: '5' }).success).toBe(true);
  });

  it('should reject a blank table number', () => {
    expect(tableOrderFormSchema.safeParse({ tableId: '   ' }).success).toBe(
      false,
    );
  });
});

describe('addItemFormSchema', () => {
  it('should accept quantity and notes', () => {
    const result = addItemFormSchema.safeParse({
      quantity: 2,
      notes: 'sem cebola',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a quantity below one', () => {
    expect(
      addItemFormSchema.safeParse({ quantity: 0, notes: '' }).success,
    ).toBe(false);
  });
});
