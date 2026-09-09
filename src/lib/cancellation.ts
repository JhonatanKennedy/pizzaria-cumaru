import { z } from 'zod';

// Shared by the waiter and kitchen contexts — both cancel with a required
// reason ('Motivo é obrigatório' is asserted by the feature specs).
export const cancellationReasonFormSchema = z.object({
  reason: z.string().trim().min(1, 'Motivo é obrigatório'),
});

export type TCancellationReasonFormValues = z.infer<
  typeof cancellationReasonFormSchema
>;
