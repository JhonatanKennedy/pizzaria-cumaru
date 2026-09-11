import type {
  CorsOptions,
  CustomOrigin,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { buildCorsOptions, parseCorsOrigins } from './cors.js';

const ALLOWED = 'http://localhost:5173';
const SECOND_ALLOWED = 'https://app.example.com';
const FOREIGN = 'https://evil.example.com';

function originCallbackOf(options: CorsOptions): CustomOrigin {
  const origin = options.origin;
  if (typeof origin !== 'function') {
    throw new Error('Expected a custom origin callback');
  }
  return origin;
}

function decide(
  options: CorsOptions,
  requestOrigin?: string,
): { error?: Error | null; allow?: unknown } {
  const decision: { error?: Error | null; allow?: unknown } = {};
  originCallbackOf(options)(requestOrigin, (error, allow) => {
    decision.error = error;
    decision.allow = allow;
  });
  return decision;
}

describe('parseCorsOrigins', () => {
  it('should split a comma-separated list', () => {
    expect(parseCorsOrigins(`${ALLOWED},${SECOND_ALLOWED}`)).toEqual([
      ALLOWED,
      SECOND_ALLOWED,
    ]);
  });

  it('should trim whitespace around each origin', () => {
    expect(parseCorsOrigins(`  ${ALLOWED} ,  ${SECOND_ALLOWED}`)).toEqual([
      ALLOWED,
      SECOND_ALLOWED,
    ]);
  });

  it('should discard empty entries', () => {
    expect(parseCorsOrigins(`${ALLOWED},,`)).toEqual([ALLOWED]);
  });

  it('should refuse a wildcard entry', () => {
    expect(() => parseCorsOrigins('*')).toThrow("'*'");
  });

  it('should refuse a wildcard hidden among other origins', () => {
    expect(() => parseCorsOrigins(`${ALLOWED},*`)).toThrow("'*'");
  });

  it('should refuse a wildcard inside an entry', () => {
    expect(() => parseCorsOrigins('https://*.example.com')).toThrow("'*'");
  });

  it('should refuse a wildcard inside an entry among other origins', () => {
    expect(() =>
      parseCorsOrigins(`${ALLOWED},https://*.evil.example.com`),
    ).toThrow("'*'");
  });

  it('should name the entry the wildcard was found in', () => {
    expect(() =>
      parseCorsOrigins(`${ALLOWED},https://*.evil.example.com`),
    ).toThrow('https://*.evil.example.com');
  });

  it('should refuse a value that is not a string', () => {
    expect(() => parseCorsOrigins(undefined)).toThrow('CORS_ORIGINS');
  });

  it('should refuse a value that yields no origin at all', () => {
    expect(() => parseCorsOrigins(', ,')).toThrow('at least one origin');
  });
});

describe('buildCorsOptions', () => {
  it('should reflect an allowlisted origin', () => {
    const options = buildCorsOptions([ALLOWED]);

    expect(decide(options, ALLOWED)).toEqual({ error: null, allow: true });
  });

  it('should answer every origin on a multi-origin allowlist', () => {
    const options = buildCorsOptions([ALLOWED, SECOND_ALLOWED]);

    expect(decide(options, SECOND_ALLOWED)).toEqual({
      error: null,
      allow: true,
    });
  });

  it('should not reflect an origin off the list, and should not raise an error', () => {
    const options = buildCorsOptions([ALLOWED]);

    expect(decide(options, FOREIGN)).toEqual({ error: null, allow: false });
  });

  it('should leave a request with no Origin neither allowed nor refused', () => {
    const options = buildCorsOptions([ALLOWED]);

    expect(decide(options, undefined)).toEqual({ error: null, allow: false });
  });

  it('should allow credentialed access', () => {
    expect(buildCorsOptions([ALLOWED]).credentials).toBe(true);
  });

  it('should still refuse an off-list origin while credentialed', () => {
    const options = buildCorsOptions([ALLOWED]);

    expect(options.credentials).toBe(true);
    expect(decide(options, FOREIGN)).toEqual({ error: null, allow: false });
  });
});
