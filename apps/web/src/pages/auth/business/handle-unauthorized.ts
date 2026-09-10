import { clearSession } from './auth-storage';

let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiryHandler(
  handler: (() => void) | null,
): void {
  onSessionExpired = handler;
}

export function handleUnauthorized(): void {
  clearSession();
  onSessionExpired?.();
}
