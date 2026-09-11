// Both e2e suites reset the same test database, so only one may hold it at a
// time. This is a PID lockfile: an exclusive create makes acquiring atomic, and
// a lock whose owner is gone is treated as stale rather than blocking forever.
//
// Used two ways:
//   - imported by scripts/run-e2e.mjs (which owns the lock for the whole run)
//   - `node scripts/e2e-lock.mjs run -- <command>` for npm scripts that are a
//     single command and have nowhere to put a try/finally
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const LOCK_PATH = resolve(REPO_ROOT, 'apps/api/.e2e.lock');

function ownerIsAlive(pid) {
  try {
    // Signal 0 performs the permission and existence checks without delivering
    // a signal — the standard way to ask "is this PID still there?".
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readOwnerPid() {
  const raw = readFileSync(LOCK_PATH, 'utf8').trim();
  const pid = Number.parseInt(raw, 10);
  return Number.isInteger(pid) ? pid : null;
}

export function acquireLock() {
  // Two attempts: the second only happens when the first found a stale owner.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(LOCK_PATH, String(process.pid), { flag: 'wx' });
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    const ownerPid = existsSync(LOCK_PATH) ? readOwnerPid() : null;
    if (ownerPid === null || !ownerIsAlive(ownerPid)) {
      rmSync(LOCK_PATH, { force: true });
      continue;
    }

    throw new Error(
      `Another e2e suite is already running (pid ${ownerPid}).\n` +
        'Both suites reset the same test database, so they cannot overlap.\n' +
        `Wait for it to finish, or remove ${LOCK_PATH} if you are sure it is gone.`,
    );
  }

  throw new Error(`Could not acquire the e2e lock at ${LOCK_PATH}`);
}

export function releaseLock() {
  if (!existsSync(LOCK_PATH)) {
    return;
  }
  if (readOwnerPid() !== process.pid) {
    return;
  }
  rmSync(LOCK_PATH, { force: true });
}

async function runLocked(command, args) {
  try {
    acquireLock();
  } catch (error) {
    // The refusal is a normal outcome, not a crash: say it in one line rather
    // than burying it in a stack trace.
    console.error(`\n✗ ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const child = spawn(command, args, { stdio: 'inherit', shell: false });
  const forward = (signal) => child.kill(signal);

  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  try {
    const code = await new Promise((done) => {
      child.on('error', (error) => {
        console.error(error.message);
        done(1);
      });
      child.on('exit', (exitCode, signal) => done(signal ? 1 : exitCode));
    });
    process.exitCode = code;
  } finally {
    releaseLock();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [subcommand, ...rest] = process.argv.slice(2);

  if (subcommand !== 'run') {
    console.error(
      'Usage: node scripts/e2e-lock.mjs run -- <command> [args...]',
    );
    process.exitCode = 1;
  } else {
    const separator = rest.indexOf('--');
    const commandArgs = separator === -1 ? rest : rest.slice(separator + 1);
    const [command, ...args] = commandArgs;

    if (!command) {
      console.error('Nothing to run. Pass a command after `--`.');
      process.exitCode = 1;
    } else {
      await runLocked(command, args);
    }
  }
}
