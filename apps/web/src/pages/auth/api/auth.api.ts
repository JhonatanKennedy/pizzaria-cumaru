import { apiRequest } from '@api/http-client';
import {
  loginResponseSchema,
  refreshResponseSchema,
  type TLoginResponse,
  type TRefreshResponse,
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

// No body and no bearer token: the only thing this call presents is the
// refresh cookie, which the browser attaches because `/auth` is its path.
export async function refreshSession(): Promise<TRefreshResponse> {
  const data = await apiRequest('/auth/refresh', { method: 'POST' });
  return refreshResponseSchema.parse(data);
}

export async function revokeToken(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
}
