import { clearSession } from './auth-storage';
import { clearAccessToken } from './session';

let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiryHandler(
  handler: (() => void) | null,
): void {
  onSessionExpired = handler;
}

// Called once a refresh has already failed — a 401 on its own no longer ends
// anything, because it is what triggers the refresh in the first place.
export function handleSessionEnded(): void {
  clearAccessToken();
  clearSession();
  onSessionExpired?.();
}
