import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const mmirPath = join(publicDir, 'mmir.html');
const indexPath = join(publicDir, 'index.html');
const apiClientPath = join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js');
const chatRuntimePath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const runtimeControlsFixPath = join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-controls-fix.js');

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing required file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
    clear: () => values.clear()
  };
}

function contentType(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml'
  }[extname(file)] || 'application/octet-stream';
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,x-mmir-local-token',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function startServer(handler) {
  const server = createServer(handler);
  await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose))
  };
}

function staticHandler(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = normalize(resolve(publicDir, `.${pathname}`));
  if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': contentType(file) });
  res.end(readFileSync(file));
}

function mockConnectorHandler(state) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.headers.authorization) {
      state.badAuthorizationHeader = true;
    }
    if (url.pathname === '/health') {
      state.health += 1;
      sendJson(res, 200, { ok: true, service: 'mmir-local-connector-mock' });
      return;
    }
    if (url.pathname === '/status') {
      state.status += 1;
      sendJson(res, 200, {
        ok: true,
        service: 'mmir-local-connector-mock',
        contract_version: '0.1',
        pairing: { required: true }
      });
      return;
    }
    if (url.pathname === '/pair') {
      state.pair += 1;
      const body = await readBody(req);
      requireTrue(req.method === 'POST', 'Mock connector /pair must be called with POST.');
      requireTrue(body.trim() === '{}' || body.includes('"code"'), 'Frontend pairing must send explicit JSON.');
      sendJson(res, 200, { token: state.token, expires_in: 900 });
      return;
    }
    const token = req.headers['x-mmir-local-token'];
    if (token !== state.token) {
      sendJson(res, 401, { error: { code: 'pairing_required', message: 'pair first' } });
      return;
    }
    if (url.pathname === '/models') {
      state.models += 1;
      sendJson(res, 200, {
        data: [
          {
            id: 'mock-local-llm',
            name: 'Mock Local LLM',
            status: 'available',
            runtime: 'ollama',
            context_length: 4096
          }
        ]
      });
      return;
    }
    if (url.pathname === '/hardware') {
      sendJson(res, 200, { cpu_count: 8, memory_gb: 16, memory_tier: 'mock-local' });
      return;
    }
    if (url.pathname === '/chat/completions') {
      state.chat += 1;
      const body = JSON.parse(await readBody(req) || '{}');
      requireTrue(req.method === 'POST', 'Mock connector /chat/completions must be called with POST.');
      requireTrue(body.model === 'mock-local-llm', 'Chat payload must use the live model from /models.');
      requireTrue(Array.isArray(body.messages) && body.messages.some((message) => message.role === 'user'), 'Chat payload must include user messages.');
      sendJson(res, 200, {
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        model: body.model,
        choices: [
          { index: 0, message: { role: 'assistant', content: 'Mock local connector answer rendered through MMIR.' }, finish_reason: 'stop' }
        ]
      });
      return;
    }
    sendJson(res, 404, { error: { code: 'not_found', message: 'missing mock route' } });
  };
}

function loadApiClient() {
  const localStorage = storage();
  const sessionStorage = storage();
  const window = {
    localStorage,
    sessionStorage,
    prompt: () => '',
    MimirApiClient: null
  };
  const context = {
    window,
    localStorage,
    sessionStorage,
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    URL,
    console
  };
  runInNewContext(read(apiClientPath), context, { filename: apiClientPath });
  return context.window.MimirApiClient;
}

async function run() {
  const html = read(mmirPath);
  const index = read(indexPath);
  const chatRuntime = read(chatRuntimePath);
  const runtimeFix = read(runtimeControlsFixPath);

  requireTrue(html.includes('The orchestration layer for trusted AI.'), 'First viewport must state the MMIR trusted-AI identity.');
  requireTrue(!html.includes('SaaS Fabric'), 'MMIR page must not expose retired SaaS Fabric branding.');
  requireTrue(index.includes('./mmir.html#mimir-instant-start'), 'Root page must send users to the MMIR first journey.');
  requireTrue(html.includes('id="mimir-instant-start"'), 'Ground-zero target must exist.');
  requireTrue(html.includes('id="mimir-prompt"'), 'Chat composer must exist in the product page.');
  requireTrue(html.indexOf('class="mimir-composer"') > html.indexOf('id="mimir-instant-start"'), 'Static page must include both Ground Zero and composer for the runtime to reorder on mobile.');
  requireTrue(chatRuntime.includes("option.dataset.runtime='live'"), 'Live /models results must populate live model choices.');
  requireTrue(chatRuntime.includes("joinUrl(url,'/chat/completions')"), 'Chat runtime must call the canonical /chat/completions route.');
  requireTrue(!html.includes('mmir-local-node-windows.ps1'), 'Static first journey must not link retired Windows local-node installer.');
  requireTrue(!html.includes('mmir-local-node-macos-linux.sh'), 'Static first journey must not link retired Mac/Linux local-node installer.');
  requireTrue(runtimeFix.includes('mmir-local-node-windows.ps1'), 'Runtime guard must detect retired Windows local-node installer output.');
  requireTrue(runtimeFix.includes('a[href*="mmir-local-node-"]'), 'Runtime guard must rewrite any retired local-node installer links.');
  requireTrue(runtimeFix.includes('mmir-local-connector-windows.cmd'), 'Runtime guard must rewrite to the Windows Local Connector installer.');
  requireTrue(runtimeFix.includes('mmir-local-connector-linux.sh'), 'Runtime guard must rewrite to the Linux/Raspberry Pi Local Connector installer.');
  requireTrue(runtimeFix.includes('mmir-local-connector-install.html'), 'Runtime guard must still route any legacy UI to the universal connector installer.');

  const site = await startServer(staticHandler);
  const connectorState = { token: 'mock-local-token', health: 0, status: 0, pair: 0, models: 0, chat: 0, badAuthorizationHeader: false };
  const connector = await startServer(mockConnectorHandler(connectorState));
  try {
    for (const viewport of ['desktop', 'mobile']) {
      const response = await fetch(`${site.url}/mmir.html#mimir-instant-start`, {
        headers: { 'user-agent': viewport === 'mobile' ? 'MMIR mobile smoke' : 'MMIR desktop smoke' }
      });
      const body = await response.text();
      requireTrue(response.ok, `${viewport} local static page must load.`);
      requireTrue(body.includes('MMIR.ai'), `${viewport} path must show MMIR.`);
      requireTrue(body.includes('Connect local AI'), `${viewport} path must expose local AI activation.`);
    }

    const api = loadApiClient();
    const profile = { provider: 'local-node' };
    await api.fetchJson(api.joinUrl(connector.url, '/health'), { timeoutMs: 5000 });
    const token = await api.pairIfNeeded(profile, connector.url);
    const headers = api.authHeaders(token);
    const models = await api.fetchJson(api.joinUrl(connector.url, '/models'), { headers, timeoutMs: 5000 });
    const liveModel = models.data?.[0]?.id;
    const answer = await api.fetchJson(api.joinUrl(connector.url, '/chat/completions'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: liveModel, messages: [{ role: 'user', content: 'Say MMIR mock local is working.' }], stream: false }),
      timeoutMs: 5000
    });
    const content = answer?.choices?.[0]?.message?.content || '';
    requireTrue(token === connectorState.token, 'Frontend API client must store and return the mock pairing token.');
    requireTrue(liveModel === 'mock-local-llm', '/models must expose the mock live model.');
    requireTrue(content.includes('Mock local connector answer'), 'Mock chat answer must use the OpenAI-compatible response shape.');
    requireTrue(connectorState.health >= 1, 'Mock connector /health must be checked.');
    requireTrue(connectorState.pair >= 1, 'Mock connector /pair must be called.');
    requireTrue(connectorState.models >= 1, 'Mock connector /models must be called.');
    requireTrue(connectorState.chat >= 1, 'Mock connector /chat/completions must be called.');
    requireTrue(!connectorState.badAuthorizationHeader, 'Public frontend flow must not send provider Authorization headers to local connector.');
  } finally {
    await Promise.all([site.close(), connector.close()]);
  }

  if (failures.length) {
    process.exitCode = 1;
    return;
  }
  console.log('First journey mock local connector smoke check passed.');
}

run().catch((error) => {
  fail(error.stack || error.message);
  process.exitCode = 1;
});
