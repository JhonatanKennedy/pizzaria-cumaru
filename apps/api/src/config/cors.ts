import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const SEPARATOR = ',';
const WILDCARD = '*';

// The allowlist is the only thing between this API and any web page that cares
// to drive it, so a wildcard is refused rather than honoured: reflecting every
// origin is precisely the hole the allowlist exists to close. The check is on
// the whole entry, not on an entry equal to `*`, because matching is an exact
// string compare — an accepted `https://*.example.com` would answer no origin
// and leave the operator with a start-up that silently blocks every request.
export function parseCorsOrigins(value: unknown): string[] {
  if (typeof value !== 'string') {
    throw new Error('CORS_ORIGINS must be a comma-separated list of origins');
  }

  const origins = value
    .split(SEPARATOR)
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const wildcard = origins.find((origin) => origin.includes(WILDCARD));
  if (wildcard !== undefined) {
    throw new Error(
      `CORS_ORIGINS must name the origins allowed to call the API; the entry '${wildcard}' contains a '*' and is not accepted`,
    );
  }

  // A value of nothing but separators is present but empty, and the difference
  // matters: the app would start and then quietly block every browser request.
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must name at least one origin');
  }

  return origins;
}

// An origin off the list is refused by not reflecting it, never by throwing:
// throwing would reach the global error filter and turn an ordinary browser
// case into a 500. A request with no Origin — curl, a test harness, the seed
// script — is left untouched, because CORS is a browser protocol with no
// opinion about a caller that is not a browser.
export function buildCorsOptions(origins: string[]): CorsOptions {
  return {
    // The refresh cookie makes this load-bearing: without it the browser
    // ignores the login response's `Set-Cookie` and there is no session at all.
    // It is legal only because the list above never reflects a wildcard — the
    // two are mutually exclusive, which is why the allowlist had to come first.
    credentials: true,
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, false);
        return;
      }
      callback(null, origins.includes(requestOrigin));
    },
  };
}
