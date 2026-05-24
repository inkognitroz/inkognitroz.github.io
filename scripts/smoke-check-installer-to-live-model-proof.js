import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const returnUrl = 'https://mmir.ai/mmir.html?mmir_local_return=1#local-connector';
const files = {
  mmir: join(publicDir, 'mmir.html'),
  localConnector: join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  activationTelemetry: join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  apiClient: join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'),
  coverage: join(publicDir, 'ui-action-coverage.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

const PROFILE_KEY = 'mimir-chat-backend-profiles';
const ACTIVE_KEY = 'mimir-chat-active-backend';
const LIVE_MODEL = 'qwen3:0.6b';
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing D206 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle)) fail(message);
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
  return new Promise((resolveBody, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolveBody(body));
    req.on('error', reject);
  });
}

async function startConnector() {
  const state = {
    health: 0,
    status: 0,
    pair: 0,
    models: 0,
    chat: 0,
    tunnel: 0,
    sawAuthorizationHeader: false,
    sawTokenHeader: false,
    sawProviderKey: false,
    token: 'd206-local-pairing-token'
  };
  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }
    if (req.headers.authorization) state.sawAuthorizationHeader = true;
    if (req.headers['x-mmir-local-token'] === state.token) state.sawTokenHeader = true;
    if (req.headers['x-openai-api-key'] || req.headers['x-provider-key']) state.sawProviderKey = true;
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/health') {
      state.health += 1;
      sendJson(res, 200, { ok: true, service: 'mmir-local-node', contract_version: '0.1' });
      return;
    }
    if (url.pathname === '/status') {
      state.status += 1;
      sendJson(res, 200, {
        ok: true,
        service: 'mmir-local-node',
        contract_version: '0.1',
        pairing: { required: true },
        cost: { paid_routes_started: false }
      });
      return;
    }
    if (url.pathname === '/pair') {
      state.pair += 1;
      const body = await readBody(req);
      requireTrue(req.method === 'POST', 'Installer-return proof must pair with POST.');
      requireTrue(body.trim() === '{}' || body.includes('"code"'), 'Installer-return proof must send explicit JSON pairing body.');
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
            id: LIVE_MODEL,
            name: 'Qwen3 0.6B local',
            status: 'available',
            runtime: 'ollama',
            access: 'free-local',
            context_length: 32768
          }
        ]
      });
      return;
    }
    if (url.pathname === '/tunnels/status') {
      state.tunnel += 1;
      sendJson(res, 200, { status: 'disabled', outbound_only: true, public_url: '' });
      return;
    }
    if (url.pathname === '/chat/completions') {
      state.chat += 1;
      const body = JSON.parse(await readBody(req) || '{}');
      requireTrue(req.method === 'POST', 'Installer-return first chat must use POST.');
      requireTrue(body.model === LIVE_MODEL, 'Installer-return proof must chat with the live free local model.');
      requireTrue(Array.isArray(body.messages) && body.messages.some((item) => item.role === 'user'), 'Installer-return first chat must include a user message.');
      requireTrue(body.stream === false, 'Installer-return first chat proof should use deterministic non-streaming response.');
      sendJson(res, 200, {
        id: 'chatcmpl-d206',
        object: 'chat.completion',
        model: body.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'D206 live local model proof answered through MMIR.'
            },
            finish_reason: 'stop'
          }
        ]
      });
      return;
    }
    sendJson(res, 404, { error: { code: 'not_found', message: 'missing D206 mock route' } });
  });
  await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
  return {
    state,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose))
  };
}

function loadApiClient(connectorUrl) {
  const localStorage = storage();
  const sessionStorage = storage();
  localStorage.setItem(PROFILE_KEY, JSON.stringify([
    {
      id: 'd206-local-node',
      name: 'MMIR Local Node',
      provider: 'local-node',
      url: connectorUrl,
      health: 'testing',
      no_paid_routes_started: true
    }
  ]));
  localStorage.setItem(ACTIVE_KEY, 'd206-local-node');
  const events = [];
  const window = {
    localStorage,
    sessionStorage,
    prompt: () => '',
    addEventListener: () => {},
    dispatchEvent: (event) => events.push({ type: event.type, detail: event.detail || {} }),
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
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || {};
      }
    },
    console
  };
  runInNewContext(text(files.apiClient), context, { filename: files.apiClient });
  return { api: context.window.MimirApiClient, localStorage, sessionStorage, events };
}

async function proveInstallerReturnToFirstChat() {
  const connector = await startConnector();
  try {
    const installReturn = new URL(returnUrl);
    requireTrue(installReturn.searchParams.get('mmir_local_return') === '1', 'D206 must start from the real installer return flag.');
    requireTrue(installReturn.hash === '#local-connector', 'D206 installer return must land on the local connector surface.');

    const { api } = loadApiClient(connector.url);
    const profile = api.activeProfile();
    const health = await api.fetchJson(api.joinUrl(connector.url, '/health'), { timeoutMs: 5000 });
    const status = await api.fetchJson(api.joinUrl(connector.url, '/status'), { timeoutMs: 5000 });
    const token = await api.pairIfNeeded(profile, connector.url);
    const headers = api.authHeaders(token);
    const models = await api.fetchJson(api.joinUrl(connector.url, '/models'), { headers, timeoutMs: 5000 });
    const tunnel = await api.fetchJson(api.joinUrl(connector.url, '/tunnels/status'), { headers, timeoutMs: 5000 });
    const liveModel = models?.data?.[0]?.id || '';
    const answer = await api.fetchJson(api.joinUrl(connector.url, '/chat/completions'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: liveModel,
        messages: [{ role: 'user', content: 'Prove MMIR can answer after installer return.' }],
        stream: false
      }),
      timeoutMs: 5000
    });
    const content = answer?.choices?.[0]?.message?.content || '';
    const proof = {
      source: 'installer-return',
      status: 'verified',
      model: liveModel,
      free: true,
      url: connector.url,
      first_chat_ready: true,
      raw_prompt_stored: false,
      raw_response_stored: false,
      provider_secrets_stored: false,
      no_paid_routes_started: true
    };
    const nextAction = proof.first_chat_ready ? { label: 'Send first answer', target: '#mimir-prompt' } : null;

    requireTrue(health.ok === true && status.ok === true, 'D206 mock local node must pass health and status.');
    requireTrue(token === connector.state.token, 'D206 installer-return proof must pair locally before model/chat routes.');
    requireTrue(liveModel === LIVE_MODEL, 'D206 must select the live free local model from /models.');
    requireTrue(tunnel.status === 'disabled' && tunnel.outbound_only === true, 'D206 tunnel state must remain free, disabled and outbound-only by default.');
    requireTrue(content.includes('D206 live local model proof answered'), 'D206 first chat proof must return an OpenAI-compatible answer.');
    requireTrue(proof.first_chat_ready === true && proof.no_paid_routes_started === true, 'D206 proof must mark first chat ready without paid routes.');
    requireTrue(nextAction?.label === 'Send first answer' && nextAction.target === '#mimir-prompt', 'D206 must leave the user at one useful next action.');
    requireTrue(connector.state.health >= 1, 'D206 must call /health after installer return.');
    requireTrue(connector.state.status >= 1, 'D206 must call /status after installer return.');
    requireTrue(connector.state.pair >= 1, 'D206 must call /pair before local model inventory.');
    requireTrue(connector.state.models >= 1, 'D206 must call /models for live model inventory.');
    requireTrue(connector.state.chat >= 1, 'D206 must call /chat/completions for first-chat proof.');
    requireTrue(connector.state.sawTokenHeader === true, 'D206 paired routes must use the local pairing token header.');
    requireTrue(connector.state.sawAuthorizationHeader === false, 'D206 must not send provider Authorization headers to local node.');
    requireTrue(connector.state.sawProviderKey === false, 'D206 must not send provider keys to local node.');
  } finally {
    await connector.close();
  }
}

async function run() {
  for (const needle of [
    'function activatePostInstallReturn()',
    "mmir_local_return')==='1'",
    'schedulePostInstallRefresh',
    "document.getElementById('runtime-refresh')?.click()",
    'mmir-local-install-returned',
    'mmir-repair-resume-started',
    'mmir-repair-resume-checked'
  ]) {
    requireIncludes(files.localConnector, needle, `D206 local connector needs installer-return closure evidence: ${needle}`);
  }
  for (const needle of [
    'handleLocalInstallReturned',
    'handleLocalConnectorRefreshed',
    'mmir-local-install-returned',
    'mmir-local-connector-refreshed',
    'tinyChatProbe',
    'mmir-install-to-first-chat-ready',
    'first_chat_ready:true',
    'Send first answer'
  ]) {
    requireIncludes(files.chatRuntime, needle, `D206 chat runtime needs installer-to-proof evidence: ${needle}`);
  }
  for (const [label, file] of [
    ['first screen', files.firstImpression],
    ['Node Dashboard', files.nodeDashboard],
    ['Progress Dashboard', files.progressDashboard]
  ]) {
    requireIncludes(file, 'Send first answer', `D206 ${label} must expose the first useful next action.`);
  }
  requireIncludes(files.activationTelemetry, 'mmir-install-to-first-chat-ready', 'D206 activation telemetry must record install-to-first-chat readiness.');
  requireIncludes(files.coverage, 'mmir-install-to-first-chat-ready', 'D206 UI coverage must include install-to-first-chat evidence.');
  requireIncludes(files.qualityWorkflow, 'smoke-check-installer-to-live-model-proof.js', 'D206 quality workflow must run the installer-to-live-model proof gate.');
  requireIncludes(files.pagesWorkflow, 'smoke-check-installer-to-live-model-proof.js', 'D206 Pages workflow must run the installer-to-live-model proof gate.');
  requireIncludes(files.backlog, '| D207 |', 'Backlog must keep D207 as the next model-activation hardening item after D206.');
  requireIncludes(files.backlog, '| D208 |', 'Backlog must keep D208 as the no-model dead-end gate after D207.');
  requireIncludes(files.backlog, '| D209 |', 'Backlog must keep D209 as the first-chat no-model DOM fixture after D208.');
  requireIncludes(files.backlog, '| D210 |', 'Backlog must keep D210 as the no-model visual pass after D209.');
  requireIncludes(files.backlog, '| D211 |', 'Backlog must keep a next sequential work item after D210.');
  requireIncludes(files.backlog, '| D212 |', 'Backlog must keep a next sequential work item after D211.');
  requireIncludes(files.backlog, '| D213 |', 'Backlog must keep a next sequential work item after D212.');
  requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
  requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');
  requireIncludes(files.mmir, 'local-connector.js?v=20260523-post-install-return', 'D206 product page must load the post-install return local connector code.');

  await proveInstallerReturnToFirstChat();

  const progress = json(files.progressData);
  const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
  const d206 = tasks.find((task) => task.seq === 'D206');
  const d207 = tasks.find((task) => task.seq === 'D207');
  const d208 = tasks.find((task) => task.seq === 'D208');
  const d209 = tasks.find((task) => task.seq === 'D209');
  const d210 = tasks.find((task) => task.seq === 'D210');
  const d211 = tasks.find((task) => task.seq === 'D211');
  const d212 = tasks.find((task) => task.seq === 'D212');
  const d213 = tasks.find((task) => task.seq === 'D213');
  const d214 = tasks.find((task) => task.seq === 'D214');
  const d237 = tasks.find((task) => task.seq === 'D253');
  requireTrue(d206?.status === 'beta', 'Progress dashboard task D206 must be beta after installer-to-live-model proof ships.');
  requireTrue(d207?.status === 'beta', 'Progress dashboard task D207 must be beta after free live-route hardening ships.');
  requireTrue(d208?.status === 'beta', 'Progress dashboard task D208 must be beta after no-model dead-end browser gate ships.');
  requireTrue(d209?.status === 'beta', 'Progress dashboard task D209 must be beta after first-chat no-model DOM fixture ships.');
  requireTrue(d210?.status === 'beta', 'Progress dashboard task D210 must be beta after no-model visual pass ships.');
  requireTrue(d211?.status === 'beta', 'Progress dashboard task D211 must be beta after public no-model deploy verification ships.');
  requireTrue(d212?.status === 'beta', 'Progress dashboard task D212 must be beta after first free chat response QA ships.');
  requireTrue(d213?.status === 'beta', 'Progress dashboard task D213 must be beta after composer action bar usefulness ships.');
  requireTrue(d214?.status === 'beta', 'Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
  requireTrue(d237?.status === 'next', 'Progress dashboard task D253 must become the next work item after D236 ships.');
  requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D253', 'Progress dashboard next queue must prioritize D253 after D236 ships.');

  if (failures.length) {
    process.exitCode = 1;
    return;
  }
  console.log('Installer-to-live-model proof smoke check passed.');
}

run().catch((error) => {
  fail(error.stack || error.message);
  process.exitCode = 1;
});
