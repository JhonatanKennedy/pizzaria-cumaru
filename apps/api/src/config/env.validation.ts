const PRODUCTION_ENV = 'production';
const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function isProduction(nodeEnv: string | undefined): boolean {
  return nodeEnv === PRODUCTION_ENV;
}

function nodeEnvOf(config: Record<string, unknown>): string | undefined {
  return typeof config.NODE_ENV === 'string' ? config.NODE_ENV : undefined;
}

/**
 * ConfigModule `validate` hook. Development (and vitest's `test` mode) pass
 * through untouched; production fails fast at boot when a required variable
 * is missing, so the app never starts half-configured.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!isProduction(nodeEnvOf(config))) {
    return config;
  }

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`,
    );
  }

  return config;
}
