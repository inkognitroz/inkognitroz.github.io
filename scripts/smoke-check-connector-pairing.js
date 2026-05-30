import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { createServer } from 'node:net';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const serverPath = join(publicDir, 'downloads', 'mmir-local-connector-server.mjs');
const manifestPath = join(publicDir, 'downloads', 'mmir-local-connector-release.json');
const textExtensions = new Set(['.cmd', '.command', '.css', '.html', '.js', '.json', '.mjs', '.ps1', '.sh', '.svg', '.txt']);
const token = 'test-local-token-1234567890';
const remoteHeaders = {
  Origin: 'https://mmir.ai',
  'Content-Type': 'application/json',
  'X-Forwarded-For': '198.51.100.42',
  'X-Forwarded-Host': 'example.trycloudflare.com',
};

function fail(message) {
  throw new Error(message);
}

function bytesForHash(file) {
  const bytes = readFileSync(file);
  if (!textExtensions.has(extname(file).toLowerCase())) return bytes;
  return Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function sha256(file) {
  return createHash('sha256').update(bytesForHash(file)).digest('hex');
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const { response } = await fetchJson(`${baseUrl}/health`, { headers: { Origin: 'https://mmir.ai' } });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  fail(`Connector did not become healthy: ${lastError?.message || 'timeout'}`);
}

async function post(baseUrl, path, body, headers = { Origin: 'https://mmir.ai', 'Content-Type': 'application/json' }) {
  return fetchJson(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
}

async function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const connectorArtifact = manifest.artifacts?.find(artifact => artifact.id === 'connector-server');
  if (!connectorArtifact) fail('Release manifest must include the connector-server artifact.');
  const actualServerHash = sha256(serverPath);
  if (connectorArtifact.sha256 !== actualServerHash) {
    fail(`Connector server checksum is stale: manifest=${connectorArtifact.sha256} actual=${actualServerHash}`);
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'mmir-connector-pairing-'));
  const tokenPath = join(tempDir, 'token.txt');
  const modelPath = join(tempDir, 'model.txt');
  writeFileSync(tokenPath, `${token}\n`);
  writeFileSync(modelPath, 'qwen2.5:0.5b\n');

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [serverPath], {
    cwd: root,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      MMIR_PAIRING_TOKEN_FILE: tokenPath,
      MMIR_DEFAULT_MODEL_FILE: modelPath,
      OLLAMA_URL: 'http://127.0.0.1:65535',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let childOutput = '';
  child.stdout.on('data', chunk => { childOutput += chunk.toString('utf8'); });
  child.stderr.on('data', chunk => { childOutput += chunk.toString('utf8'); });

  try {
    await waitForHealth(baseUrl);

    const localPair = await post(baseUrl, '/pair', {});
    if (localPair.response.status !== 200 || localPair.payload?.token !== token || localPair.payload?.pairing_mode !== 'local-loopback') {
      fail('Loopback pairing must return the local token without requiring a remote code.');
    }

    const remoteWithoutCode = await post(baseUrl, '/pair', {}, remoteHeaders);
    if (remoteWithoutCode.response.status !== 403 || remoteWithoutCode.payload?.error?.code !== 'remote_pairing_code_required') {
      fail('Remote/tunneled pairing without a code must fail closed with remote_pairing_code_required.');
    }

    const remoteSession = await post(baseUrl, '/pairing/sessions', {}, remoteHeaders);
    if (remoteSession.response.status !== 403 || remoteSession.payload?.error?.code !== 'local_pairing_session_required') {
      fail('Remote/tunneled clients must not be able to create pairing sessions.');
    }

    const localSession = await post(baseUrl, '/pairing/sessions', {});
    const code = String(localSession.payload?.code || '');
    if (localSession.response.status !== 200 || !/^\d{6}$/.test(code)) {
      fail('Local device must be able to create a six-digit remote pairing code.');
    }

    const remoteWithCode = await post(baseUrl, '/pair', { code }, remoteHeaders);
    if (remoteWithCode.response.status !== 200 || remoteWithCode.payload?.token !== token || remoteWithCode.payload?.pairing_mode !== 'remote-code') {
      fail('Remote/tunneled pairing with a fresh code must return the local token once.');
    }

    const remoteReuse = await post(baseUrl, '/pair', { code }, remoteHeaders);
    if (remoteReuse.response.status !== 403 || remoteReuse.payload?.error?.code !== 'remote_pairing_code_required') {
      fail('Remote pairing code reuse must fail closed.');
    }
  } finally {
    child.kill();
    rmSync(tempDir, { recursive: true, force: true });
  }

  if (child.exitCode && child.exitCode !== 0) {
    fail(`Connector exited unexpectedly: ${childOutput}`);
  }

  console.log('Connector pairing smoke check passed.');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
