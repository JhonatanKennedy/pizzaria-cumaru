// Runs the browser e2e suite with everything it needs already up.
//
// Cypress has no `webServer` equivalent, so this script is what makes
// `npm run test:e2e` the whole story: Postgres, the API and the SPA are started
// here if they are not already running, and the API is pointed at the TEST
// database so the run can never reach the developer's own data.
//
// The e2e stack takes its own ports rather than reusing the dev ones. The API
// port is unconstrained by CORS — the allowlist names the browser origin, not
// the API — so a private 3100/5174 pair means this works whether or not
// `npm run dev:api` and `npm run dev:web` are up, and kills nothing.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { acquireLock, releaseLock } from './e2e-lock.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = resolve(REPO_ROOT, 'apps/api');
const WEB_DIR = resolve(REPO_ROOT, 'apps/web');

const API_PORT = 3100;
const WEB_PORT = 5174;
const API_ORIGIN = `http://localhost:${API_PORT}`;
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const ENTRY_MODULE = '/src/main.tsx';

const SEED_LOGIN = 'ana.gerente';
const SEED_PASSWORD = 'SenhaSegura123';

const BIN = (name) => resolve(REPO_ROOT, 'node_modules/.bin', name);
const COMPOSE_FILE = resolve(API_DIR, 'docker-compose.yml');

const STARTUP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 500;
const DEFAULT_POSTGRES_PORT = 5432;

const open = process.argv.includes('--open');
// Every other argument reaches Cypress untouched, so one spec can be run on its
// own while it is being written: `npm run test:e2e -- --spec cypress/e2e/auth.cy.ts`.
// (npm strips the `--` separator before the script sees it, so the flags arrive
// as plain argv — hence the filter rather than a slice after `--`.) The stack
// comes up the same way either way: a filter changes what runs, not what has to
// be running.
const cypressArgs = process.argv
  .slice(2)
  .filter((argument) => argument !== '--open' && argument !== '--');
const spawned = [];

function step(message) {
  console.log(`\n▶ ${message}`);
}

function info(message) {
  console.log(`  ${message}`);
}

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const entries = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    entries[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return entries;
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  const code = await new Promise((done) => {
    child.on('error', (error) => {
      console.error(`  ${command}: ${error.message}`);
      done(1);
    });
    child.on('exit', (exitCode, signal) => done(signal ? 1 : exitCode));
  });

  if (code !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` exited with ${code}`);
  }
}

// `detached` puts each server in its own process group, so teardown can signal
// the whole tree — Vite spawns esbuild, which would otherwise survive.
function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    detached: true,
    ...options,
  });
  child.on('error', (error) => {
    console.error(`  ${command}: ${error.message}`);
  });
  spawned.push(child);
  return child;
}

function stopAll() {
  for (const child of spawned) {
    if (child.exitCode !== null || child.signalCode !== null) {
      continue;
    }
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

function canConnect(port, host) {
  return new Promise((done) => {
    const socket = createConnection({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => {
      socket.destroy();
      done(false);
    });
  });
}

// A server told to listen on `localhost` lands on whichever loopback address
// the OS resolves the name to, and the two do not have to agree: on this machine
// Vite takes ::1 while Express takes 127.0.0.1. Probing both is what keeps
// readiness honest without pinning a host neither server promises.
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'];

async function isListening(port, host) {
  if (host !== undefined) {
    return canConnect(port, host);
  }

  const answers = await Promise.all(
    LOOPBACK_HOSTS.map((candidate) => canConnect(port, candidate)),
  );
  return answers.some(Boolean);
}

function waitForPort(port, host, timeoutMs = STARTUP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  const where = host ?? LOOPBACK_HOSTS.join(' or ');

  return new Promise((done, fail) => {
    const attempt = async () => {
      if (await isListening(port, host)) {
        done();
        return;
      }
      if (Date.now() > deadline) {
        fail(new Error(`Nothing accepted a connection on ${where}:${port}`));
      } else {
        setTimeout(attempt, POLL_INTERVAL_MS);
      }
    };
    void attempt();
  });
}

// Postgres is reached through whatever the developer already has, not through
// this repo's compose file specifically: one server on 5432 holds both
// `pizzaria_cumaru` and `pizzaria_cumaru_test`, and it may well have been
// started by an older checkout's container. Starting a second one would fail on
// the port binding rather than help, so the container is only a fallback for a
// machine where nothing is listening at all.
async function ensurePostgres(host, port) {
  if (await canConnect(port, host)) {
    info(`already accepting connections on ${host}:${port}`);
    return;
  }

  await run('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', '--wait']);
  await waitForPort(port, host);
  info(`started on ${host}:${port}`);
}

// The API has no health endpoint and logs no port, so readiness is proved by
// doing the one thing the suite will do: log a seeded user in. That a 201 comes
// back proves the server is up, the migrations are applied and the seed landed.
async function waitForApiReady(timeoutMs = STARTUP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastOutcome = 'no response yet';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${API_ORIGIN}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: SEED_LOGIN, password: SEED_PASSWORD }),
      });

      if (response.status === 201) {
        return;
      }
      lastOutcome = `login answered ${response.status}`;
    } catch (error) {
      lastOutcome = error.message;
    }

    await new Promise((done) => setTimeout(done, POLL_INTERVAL_MS));
  }

  throw new Error(
    `The API never accepted a seeded login (${lastOutcome}).\n` +
      'Check that apps/api/.env.local has a TEST_DATABASE_URL and that the seed ran.',
  );
}

// Vite answers on its port before it has transformed anything: it compiles each
// module on the first request for it, and re-bundles its dependencies when a
// request reaches one it had not scanned. A spec that arrives inside that window
// gets a blank document — the entry module is refused and the page reloads once
// Vite has caught up — which reads as a failure in whichever test was first.
// So readiness is proved the way the API's is: by fetching the entry module the
// browser will ask for, and requiring a transformed module back.
async function waitForWebReady(timeoutMs = STARTUP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastOutcome = 'no response yet';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${WEB_ORIGIN}${ENTRY_MODULE}`);
      const source = await response.text();

      if (response.status === 200 && source.includes('createRoot')) {
        return;
      }
      lastOutcome = `${ENTRY_MODULE} answered ${response.status}`;
    } catch (error) {
      lastOutcome = error.message;
    }

    await new Promise((done) => setTimeout(done, POLL_INTERVAL_MS));
  }

  throw new Error(
    `The SPA never served a transformed ${ENTRY_MODULE} (${lastOutcome}).`,
  );
}

async function main() {
  const envPath = resolve(API_DIR, '.env.local');
  const fileEnv = readEnvFile(envPath);
  const testDatabaseUrl = fileEnv.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error(
      `No TEST_DATABASE_URL in ${envPath}.\n` +
        'Recreate it from apps/api/.env.example — it is gitignored and so does not travel with a clone.',
    );
  }

  // Fail closed. Every step below is destructive, and the one mistake that
  // matters is pointing them at the development database.
  if (!/_test(\?|$)/.test(testDatabaseUrl)) {
    throw new Error(
      `Refusing to run: TEST_DATABASE_URL does not name a _test database.\n` +
        `  ${testDatabaseUrl}\n` +
        'The reset step drops and recreates the schema it points at.',
    );
  }

  acquireLock();

  const apiEnv = {
    ...process.env,
    NODE_ENV: 'development',
    DATABASE_URL: testDatabaseUrl,
    PORT: String(API_PORT),
    CORS_ORIGINS: WEB_ORIGIN,
  };

  step('Postgres');
  const database = new URL(testDatabaseUrl);
  await ensurePostgres(
    database.hostname,
    Number(database.port || DEFAULT_POSTGRES_PORT),
  );

  step('Test database');
  await run(BIN('prisma'), ['migrate', 'reset', '--force'], {
    cwd: API_DIR,
    env: apiEnv,
  });
  info(`schema reset at ${testDatabaseUrl.replace(/:[^:@/]*@/, ':***@')}`);

  step('Build and seed');
  await run('npm', ['run', 'build', '-w', 'apps/api']);
  await run('node', [resolve(API_DIR, 'dist/prisma/seed.js')], {
    cwd: API_DIR,
    env: apiEnv,
  });

  step(`API on ${API_ORIGIN}`);
  start('node', [resolve(API_DIR, 'dist/main.js')], {
    cwd: API_DIR,
    env: apiEnv,
  });
  await waitForPort(API_PORT);
  await waitForApiReady();
  info(`answering, and "${SEED_LOGIN}" can log in`);

  step(`SPA on ${WEB_ORIGIN}`);
  start(BIN('vite'), ['--port', String(WEB_PORT), '--strictPort'], {
    cwd: WEB_DIR,
    // Vite lets an existing process env var win over .env files, so the SPA
    // talks to this run's API rather than the default port 3000.
    env: { ...process.env, VITE_API_URL: API_ORIGIN },
  });
  await waitForPort(WEB_PORT);
  await waitForWebReady();
  info(`serving against ${API_ORIGIN}`);

  step('Browser e2e');
  await run(BIN('cypress'), [open ? 'open' : 'run', ...cypressArgs], {
    cwd: WEB_DIR,
    env: { ...process.env, CYPRESS_API_ORIGIN: API_ORIGIN },
  });
}

let failure = null;

try {
  await main();
} catch (error) {
  failure = error;
} finally {
  stopAll();
  releaseLock();
}

if (failure) {
  console.error(`\n✗ ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log('\n✓ Browser e2e passed');
}
