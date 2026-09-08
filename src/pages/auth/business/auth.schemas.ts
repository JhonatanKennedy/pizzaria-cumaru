import { z } from 'zod';
import { USER_ROLES } from './role';

export const loginFormSchema = z.object({
  login: z.string().trim().min(1, 'Usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type TLoginFormValues = z.infer<typeof loginFormSchema>;

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.number(),
    login: z.string(),
    role: z.enum(USER_ROLES),
  }),
});

export type TLoginResponse = z.infer<typeof loginResponseSchema>;
