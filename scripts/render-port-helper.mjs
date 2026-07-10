import { rmSync } from 'node:fs';
import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const lockDir = join(tmpdir(), 'mmir-render-port-locks');

function lockPath(candidatePort, host) {
  return join(lockDir, `${host.replace(/[^a-z0-9.-]/gi, '_')}-${candidatePort}.lock`);
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function removeStaleLock(file) {
  try {
    const pid = Number(await readFile(file, 'utf8'));
    if (!processIsAlive(pid)) await rm(file, { force: true });
  } catch {
    await rm(file, { force: true });
  }
}

async function reservePort(candidatePort, host) {
  await mkdir(lockDir, { recursive: true });
  const file = lockPath(candidatePort, host);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(file, 'wx');
      await handle.writeFile(String(process.pid));
      await handle.close();
      const release = () => {
        try {
          rmSync(file, { force: true });
        } catch {}
      };
      process.once('exit', release);
      process.once('SIGINT', () => {
        release();
        process.exit(130);
      });
      process.once('SIGTERM', () => {
        release();
        process.exit(143);
      });
      return release;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      await removeStaleLock(file);
    }
  }
  return null;
}

function canListen(candidatePort, host) {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', error => {
      if (error?.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });
    probe.listen(candidatePort, host, () => {
      probe.close(() => resolve(true));
    });
  });
}

export async function resolveRenderPort({
  envName,
  defaultPort,
  host,
  attempts,
  attemptsEnvName,
  label = 'render check'
}) {
  const requestedPort = Number(process.env[envName] || defaultPort);
  const maxAttempts = Number(process.env[attemptsEnvName] || attempts || 50);

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = requestedPort + offset;
    const release = await reservePort(candidate, host);
    if (!release) continue;
    if (await canListen(candidate, host)) {
      if (candidate !== requestedPort) {
        console.log(`${label} port ${requestedPort} busy; using ${candidate}.`);
      }
      return candidate;
    }
    release();
  }

  throw new Error(`No available ${label} port found from ${requestedPort} across ${maxAttempts} attempts`);
}
