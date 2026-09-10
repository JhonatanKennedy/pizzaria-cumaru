import { isProduction, validateEnv } from './env.validation.js';

const DATABASE_URL =
  'postgresql://prisma:prisma@localhost:5432/pizzaria_cumaru';
const JWT_SECRET = 'secret';

function makeEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { NODE_ENV: 'production', DATABASE_URL, JWT_SECRET, ...overrides };
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

describe('validateEnv', () => {
  it('should pass through a complete production config', () => {
    const config = makeEnv();

    expect(validateEnv(config)).toBe(config);
  });

  it('should throw when JWT_SECRET is missing in production', () => {
    const config = makeEnv({ JWT_SECRET: undefined });

    expect(() => validateEnv(config)).toThrow('JWT_SECRET');
  });

  it('should list every missing variable in production', () => {
    const config = makeEnv({ DATABASE_URL: undefined, JWT_SECRET: undefined });

    expect(() => validateEnv(config)).toThrow(
      'Missing required environment variables in production: DATABASE_URL, JWT_SECRET',
    );
  });

  it('should not require variables in development', () => {
    const config = { NODE_ENV: 'development' };

    expect(validateEnv(config)).toBe(config);
  });

  it('should not require variables in test', () => {
    const config = { NODE_ENV: 'test' };

    expect(validateEnv(config)).toBe(config);
  });

  it('should not require variables when NODE_ENV is unset', () => {
    const config = {};

    expect(validateEnv(config)).toBe(config);
  });
});
