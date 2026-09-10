import { z } from 'zod';
import { USER_ROLES } from './role';

export const loginFormSchema = z.object({
  login: z.string().trim().min(1, 'Usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type TLoginFormValues = z.infer<typeof loginFormSchema>;

// `accessToken`, not `token`: with two tokens in play the old name named
// nothing in particular, and the refresh token is deliberately absent from
// every response body — it only ever arrives in the cookie.
export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: z.object({
    id: z.number(),
    login: z.string(),
    role: z.enum(USER_ROLES),
  }),
});

export type TLoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export type TRefreshResponse = z.infer<typeof refreshResponseSchema>;
