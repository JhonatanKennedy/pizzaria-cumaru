import {
  DEV_ACCESS_SECRET,
  DEV_REFRESH_SECRET,
  accessSecret,
  isProduction,
  refreshSecret,
  validateEnv,
} from './env.validation.js';

const CORS_ORIGINS = 'http://localhost:5173';
const DATABASE_URL =
  'postgresql://prisma:prisma@localhost:5432/pizzaria_cumaru';
const JWT_SECRET = 'secret';
const JWT_REFRESH_SECRET = 'a-different-secret';

function makeEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    NODE_ENV: 'production',
    DATABASE_URL,
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    CORS_ORIGINS,
    ...overrides,
  };
}

describe('isProduction', () => {
  it('should return true for production', () => {
    expect(isProduction('production')).toBe(true);
  });

  it('should return false for development', () => {
    expect(isProduction('development')).toBe(false);
  });

  it('should return false for test', () => {
    expect(isProduction('test')).toBe(false);
  });

  it('should return false when NODE_ENV is unset', () => {
    expect(isProduction(undefined)).toBe(false);
  });
});

describe('accessSecret', () => {
  it('should read the configured access secret', () => {
    expect(accessSecret({ JWT_SECRET })).toBe(JWT_SECRET);
  });

  it('should fall back to the development access secret', () => {
    expect(accessSecret({})).toBe(DEV_ACCESS_SECRET);
    expect(accessSecret({ JWT_SECRET: '' })).toBe(DEV_ACCESS_SECRET);
  });
});

describe('refreshSecret', () => {
  it('should read the configured refresh secret', () => {
    expect(refreshSecret({ JWT_REFRESH_SECRET })).toBe(JWT_REFRESH_SECRET);
  });

  it('should fall back to the development refresh secret', () => {
    expect(refreshSecret({})).toBe(DEV_REFRESH_SECRET);
    expect(refreshSecret({ JWT_REFRESH_SECRET: '' })).toBe(DEV_REFRESH_SECRET);
  });
});

describe('validateEnv', () => {
  it('should pass through a complete production config', () => {
    const config = makeEnv();

    expect(validateEnv(config)).toBe(config);
  });

  it('should throw when JWT_SECRET is missing in production', () => {
    const config = makeEnv({ JWT_SECRET: undefined });

    expect(() => validateEnv(config)).toThrow('JWT_SECRET');
  });

  it('should throw when JWT_REFRESH_SECRET is missing in production', () => {
    const config = makeEnv({ JWT_REFRESH_SECRET: undefined });

    expect(() => validateEnv(config)).toThrow('JWT_REFRESH_SECRET');
  });

  it('should list every missing variable in production', () => {
    const config = makeEnv({
      DATABASE_URL: undefined,
      JWT_SECRET: undefined,
      JWT_REFRESH_SECRET: undefined,
      CORS_ORIGINS: undefined,
    });

    expect(() => validateEnv(config)).toThrow(
      'Missing required environment variables: CORS_ORIGINS, DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET',
    );
  });

  it('should throw when CORS_ORIGINS is missing in production', () => {
    const config = makeEnv({ CORS_ORIGINS: undefined });

    expect(() => validateEnv(config)).toThrow('CORS_ORIGINS');
  });

  it('should refuse a production config whose two secrets are equal', () => {
    const config = makeEnv({ JWT_REFRESH_SECRET: JWT_SECRET });

    expect(() => validateEnv(config)).toThrow(
      'JWT_REFRESH_SECRET must differ from JWT_SECRET',
    );
  });

  it('should name both variables when refusing equal secrets', () => {
    const config = makeEnv({ JWT_REFRESH_SECRET: JWT_SECRET });

    expect(() => validateEnv(config)).toThrow(/JWT_REFRESH_SECRET/);
    expect(() => validateEnv(config)).toThrow(/JWT_SECRET/);
  });

  it('should still refuse equal secrets outside production', () => {
    const config = {
      NODE_ENV: 'development',
      CORS_ORIGINS,
      JWT_SECRET,
      JWT_REFRESH_SECRET: JWT_SECRET,
    };

    expect(() => validateEnv(config)).toThrow(
      'JWT_REFRESH_SECRET must differ from JWT_SECRET',
    );
  });

  it('should refuse an access secret that collides with the refresh fallback', () => {
    const config = {
      NODE_ENV: 'development',
      CORS_ORIGINS,
      JWT_SECRET: DEV_REFRESH_SECRET,
    };

    expect(() => validateEnv(config)).toThrow(
      'JWT_REFRESH_SECRET must differ from JWT_SECRET',
    );
  });

  it('should pass through a development config that carries CORS_ORIGINS', () => {
    const config = { NODE_ENV: 'development', CORS_ORIGINS };

    expect(validateEnv(config)).toBe(config);
  });

  it('should take the distinct development fallbacks as distinct', () => {
    expect(DEV_ACCESS_SECRET).not.toBe(DEV_REFRESH_SECRET);
    expect(() =>
      validateEnv({ NODE_ENV: 'development', CORS_ORIGINS }),
    ).not.toThrow();
  });

  it('should throw when CORS_ORIGINS is missing in development', () => {
    const config = { NODE_ENV: 'development' };

    expect(() => validateEnv(config)).toThrow('CORS_ORIGINS');
  });

  it('should throw when CORS_ORIGINS is missing in test', () => {
    const config = { NODE_ENV: 'test' };

    expect(() => validateEnv(config)).toThrow('CORS_ORIGINS');
  });

  it('should throw when CORS_ORIGINS is missing and NODE_ENV is unset', () => {
    const config = {};

    expect(() => validateEnv(config)).toThrow('CORS_ORIGINS');
  });
});
