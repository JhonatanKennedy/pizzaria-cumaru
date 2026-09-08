import { ApiError } from '../api/http-client';

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Unexpected error. Try again.';
}
