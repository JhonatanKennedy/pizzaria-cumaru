import { refreshSession } from '../api/auth.api';

// In memory, deliberately: a module-level variable is still readable by script
// running right now, but nothing survives the tab, so there is no credential
// left behind to be picked up later. The 15-minute lifetime is what bounds the
// live case.
let accessToken: string | null = null;
let inFlightRefresh: Promise<string | null> | null = null;

export function readAccessToken(): string | null {
  return accessToken;
}

export function writeAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// One refresh at a time, and every caller gets that same one. Rotation refuses
// the token it replaced, so a screen firing five requests at once would
// otherwise fire five refreshes, four of which would present a token the first
// had already spent — 401s that look like an ended session and would end it.
export function refreshAccessToken(): Promise<string | null> {
  inFlightRefresh ??= performRefresh().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

async function performRefresh(): Promise<string | null> {
  try {
    const { accessToken: refreshed } = await refreshSession();
    accessToken = refreshed;
    return refreshed;
  } catch {
    // A refused refresh means there is no session to continue — the caller
    // decides what that means, this one only reports it.
    return null;
  }
}
