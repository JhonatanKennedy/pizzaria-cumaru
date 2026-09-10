import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../../config/env.validation.js';
import { REFRESH_TOKEN_MAX_AGE_MS } from '../application/session-tokens.js';

export const REFRESH_COOKIE_NAME = 'refresh_token';

// Scoped to the only routes that read it. `Path` is what stands in for a CSRF
// token here: a cookie the browser attaches to every request would ride along
// on each one the SPA makes, and the narrower path means a forged form post
// from another origin has nothing to present to `/auth`.
const REFRESH_COOKIE_PATH = '/auth';

function baseCookieOptions(nodeEnv: string | undefined): CookieOptions {
  return {
    // HttpOnly blocks scripts from reading the token, not from making a request
    // that carries it — which is why the path scoping above carries weight.
    httpOnly: true,
    // Lax withholds the cookie from a cross-site POST, so a forged submission
    // reaches `/auth/logout` and `/auth/refresh` without it.
    sameSite: 'lax',
    // Off outside production: the flag keeps the cookie off plain HTTP, which
    // would also keep it off the dev server.
    secure: isProduction(nodeEnv),
    path: REFRESH_COOKIE_PATH,
  };
}

export function refreshCookieOptions(
  nodeEnv: string | undefined,
): CookieOptions {
  return { ...baseCookieOptions(nodeEnv), maxAge: REFRESH_TOKEN_MAX_AGE_MS };
}

export function setRefreshCookie(
  response: Response,
  token: string,
  nodeEnv: string | undefined,
): void {
  response.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(nodeEnv));
}

export function clearRefreshCookie(
  response: Response,
  nodeEnv: string | undefined,
): void {
  // No Max-Age: clearing has to expire the cookie now, and the options still
  // have to match the ones it was set with or the browser keeps it.
  response.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions(nodeEnv));
}

export function readRefreshCookie(request: Request): string | undefined {
  const value = (request.cookies as Record<string, unknown> | undefined)?.[
    REFRESH_COOKIE_NAME
  ];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
