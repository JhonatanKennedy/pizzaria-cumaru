// Mirrors apps/api/src/prisma/seed-data.ts — the accounts `npm run seed`
// creates. The suite runs against a freshly seeded test database, so nothing
// here may drift from that file without the seed changing too.
export const SEED_PASSWORD = 'SenhaSegura123';

export const SEEDED_USERS = {
  manager: 'ana.gerente',
  waiter: 'joao.garcom',
  cook: 'carlos.cozinha',
} as const;

export interface ILoginResponse {
  accessToken: string;
  user: { id: number; login: string; role: string };
}

// `Cypress.expose` returns `any`; this is the guarded read that keeps the suite
// under the repo's no-`any` rule.
export function apiOrigin(): string {
  const origin: unknown = Cypress.expose('apiOrigin');

  if (typeof origin !== 'string') {
    throw new Error(
      'apiOrigin is not configured. Run through `npm run test:e2e`, or set CYPRESS_API_ORIGIN.',
    );
  }
  return origin;
}
