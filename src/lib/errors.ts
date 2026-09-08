import { ApiError } from '@api/http-client';

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Algo deu errado. Tente novamente!';
}
