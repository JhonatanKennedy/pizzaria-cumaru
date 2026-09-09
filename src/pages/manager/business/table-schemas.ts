import { z } from 'zod';

// An empty RHF number field parses to NaN, which zod rejects at the type
// level — so "Número é obrigatório" hangs on the z.number message.
export const tableNumberFormSchema = z.object({
  number: z
    .number({ message: 'Número é obrigatório' })
    .int({ message: 'O número da mesa deve ser inteiro' })
    .positive({ message: 'Número deve ser maior que zero' }),
});

export type TTableNumberFormValues = z.infer<typeof tableNumberFormSchema>;
