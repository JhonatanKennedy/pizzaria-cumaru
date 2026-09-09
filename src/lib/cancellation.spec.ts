import { cancellationReasonFormSchema } from './cancellation';

describe('cancellationReasonFormSchema', () => {
  it('should accept a reason', () => {
    expect(
      cancellationReasonFormSchema.safeParse({ reason: 'Cliente desistiu' })
        .success,
    ).toBe(true);
  });

  it('should reject a blank reason', () => {
    expect(
      cancellationReasonFormSchema.safeParse({ reason: ' ' }).success,
    ).toBe(false);
  });
});
