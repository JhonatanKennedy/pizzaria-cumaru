import { defineConfig } from 'cypress';

// `scripts/run-e2e.mjs` starts both servers and passes their origin through.
// The defaults match what it starts, so `cypress open` works on its own once
// the stack is up.
const apiOrigin = process.env.CYPRESS_API_ORIGIN ?? 'http://localhost:3100';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5174',
    // `expose`, not `env`: Cypress 16 removed `Cypress.env()`, and `env` is now
    // the private bucket the spec cannot read. An origin is not a secret.
    expose: { apiOrigin },
    // Every spec runs in a fresh browser whose cache is empty, and the SPA is
    // served by the dev server, which compiles each module on first request —
    // so a spec's opening screen can take longer to render than Cypress's 4s
    // default allows. Four seconds is a real-network budget, not a cold-bundle
    // one, and a timeout here fails a spec that was only slow.
    defaultCommandTimeout: 10_000,
    // The suite drives a real stack over a real network; a genuinely flaky spec
    // is a bug to fix, not to retry away.
    retries: 0,
    // Cypress records video by default in run mode. Nobody watches it — the
    // failure artifact worth collecting is the screenshot, which CI uploads.
    video: false,
  },
});
