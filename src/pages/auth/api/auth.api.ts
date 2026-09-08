import { apiRequest } from '../../../api/http-client';
import {
  loginResponseSchema,
  type TLoginResponse,
} from '../business/auth.schemas';

export async function authenticate(
  login: string,
  password: string,
): Promise<TLoginResponse> {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
  return loginResponseSchema.parse(data);
}

export async function revokeToken(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
}
