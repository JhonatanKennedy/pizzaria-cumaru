import { tableNumberFormSchema } from './table-schemas';

describe('tableNumberFormSchema', () => {
  it('should accept a positive integer table number', () => {
    const result = tableNumberFormSchema.safeParse({ number: 11 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.number).toBe(11);
    }
  });

  it('should reject NaN as the required check', () => {
    const result = tableNumberFormSchema.safeParse({ number: NaN });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Número é obrigatório');
    }
  });

  it('should reject zero and negative numbers', () => {
    const zero = tableNumberFormSchema.safeParse({ number: 0 });
    expect(zero.success).toBe(false);
    if (!zero.success) {
      expect(zero.error.issues[0].message).toBe(
        'Número deve ser maior que zero',
      );
    }

    const negative = tableNumberFormSchema.safeParse({ number: -3 });
    expect(negative.success).toBe(false);
  });

  it('should reject non-integer numbers', () => {
    const result = tableNumberFormSchema.safeParse({ number: 3.5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'O número da mesa deve ser inteiro',
      );
    }
  });
});
