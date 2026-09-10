const PRODUCTION_ENV = 'production';

// CORS_ORIGINS is required in every mode: an allowlist that silently defaulted
// would leave the SPA blocked by a browser error that names nothing useful.
const REQUIRED_ALWAYS = ['CORS_ORIGINS'] as const;
const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

// What the app signs with when the environment supplies nothing — which is the
// state of a fresh clone, since `.env.local` never travels with the repository.
// The two differ so the signature check still separates the token kinds there.
export const DEV_ACCESS_SECRET = 'dev-secret-change-me';
export const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-me';

export function isProduction(nodeEnv: string | undefined): boolean {
  return nodeEnv === PRODUCTION_ENV;
}

function nodeEnvOf(config: Record<string, unknown>): string | undefined {
  return typeof config.NODE_ENV === 'string' ? config.NODE_ENV : undefined;
}

function requiredIn(nodeEnv: string | undefined): readonly string[] {
  if (isProduction(nodeEnv)) {
    return [...REQUIRED_ALWAYS, ...REQUIRED_IN_PRODUCTION];
  }

  return REQUIRED_ALWAYS;
}

export function accessSecret(config: Record<string, unknown>): string {
  return secretOf(config.JWT_SECRET, DEV_ACCESS_SECRET);
}

export function refreshSecret(config: Record<string, unknown>): string {
  return secretOf(config.JWT_REFRESH_SECRET, DEV_REFRESH_SECRET);
}

function secretOf(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * ConfigModule `validate` hook. A variable the running mode needs and does not
 * have fails the boot, so the app never starts half-configured.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = requiredIn(nodeEnvOf(config)).filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  // Equal secrets leave the `typ` claim as the only thing separating an access
  // token from a refresh token, and a signature check cannot catch that — the
  // signature would legitimately verify. Compared on the effective values so a
  // fallback that collided with a configured secret is refused too.
  if (accessSecret(config) === refreshSecret(config)) {
    throw new Error(
      'JWT_REFRESH_SECRET must differ from JWT_SECRET: a refresh token has to fail verification against the access secret',
    );
  }

  return config;
}
