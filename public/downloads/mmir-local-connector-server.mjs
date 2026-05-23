import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const TOKEN = fs.readFileSync(process.env.MMIR_PAIRING_TOKEN_FILE, 'utf8').trim();
const MODEL = fs.readFileSync(process.env.MMIR_DEFAULT_MODEL_FILE, 'utf8').trim() || 'llama3.2:1b';
const PLATFORM = process.env.MMIR_CONNECTOR_PLATFORM || os.platform();
const VERSION = '0.1.0-standalone-device';
const CONTRACT_VERSION = '0.1';
const TUNNEL_CONTROL_ENABLED = process.env.MMIR_ENABLE_TUNNEL_CONTROL === 'true';
const TUNNEL_LOCAL_URL = `http://127.0.0.1:${PORT}`;

const tunnelState = {
  provider: 'trycloudflare',
  status: TUNNEL_CONTROL_ENABLED ? 'stopped' : 'disabled',
  public_url: null,
  started_at: null,
  error: null,
  process: null,
  logs: [],
};
const modelPulls = new Map();
let remotePairingSession = null;

const allowed = new Set([
  'https://mmir.ai',
  'https://www.mmir.ai',
  'https://inkognitroz.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function okOrigin(origin) {
  return !origin || allowed.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function cors(origin) {
  return {
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-mmir-local-token',
    'access-control-allow-origin': okOrigin(origin) ? (origin || 'https://mmir.ai') : 'null',
  };
}

function send(res, code, payload, origin, type = 'application/json; charset=utf-8') {
  res.writeHead(code, {
    'content-type': type,
    'cache-control': 'no-store',
    ...cors(origin),
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(payload) : payload);
}

function errorCode(status) {
  if (status === 400) return 'invalid_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  return 'runtime_unavailable';
}

function fail(res, code, message, origin) {
  send(res, code, {
    error: {
      code: errorCode(code),
      message,
    },
  }, origin);
}

function nodeCapabilities() {
  return [
    'health',
    'status',
    'doctor',
    'node.identity',
    'pairing',
    'pairing.remote-code',
    'hardware',
    'models',
    'models.pull',
    'models.pull.status',
    'models.delete',
    'chat.completions',
    'tunnels.status',
    'tunnels.trycloudflare',
    'tunnels.stop',
  ];
}

function nodeIdentity() {
  const profile = hardware();
  return {
    id: `mmir-local-${PLATFORM}`,
    name: 'MMIR Local Connector',
    type: 'local',
    device_class: profile.memory_tier,
    platform: os.platform(),
    arch: os.arch(),
    runtime: 'ollama',
    trust_level: 'paired-local',
    registration: PLATFORM,
    contract_version: CONTRACT_VERSION,
    capabilities: nodeCapabilities(),
  };
}

function appendTunnelLog(message) {
  const text = String(message || '').trim();
  if (!text) return;

  tunnelState.logs.push({
    timestamp: new Date().toISOString(),
    message: text.slice(0, 600),
  });
  tunnelState.logs = tunnelState.logs.slice(-20);

  const urlMatch = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (urlMatch) {
    tunnelState.public_url = urlMatch[0];
    tunnelState.status = 'online';
    tunnelState.error = null;
  }
}

function tunnelPayload() {
  return {
    provider: tunnelState.provider,
    status: tunnelState.status,
    control_enabled: TUNNEL_CONTROL_ENABLED,
    local_url: TUNNEL_LOCAL_URL,
    public_url: tunnelState.public_url,
    started_at: tunnelState.started_at,
    error: tunnelState.error,
    requirements: [
      'cloudflared installed on PATH',
      'MMIR_ENABLE_TUNNEL_CONTROL=true set locally before starting MMIR Local Connector',
      'pairing token required before tunnel status/start/stop',
    ],
    security: [
      'Tunnel is opt-in and disabled by default',
      'Raw Ollama stays private on 127.0.0.1:11434',
      'MMIR model/chat routes still require the local pairing token',
      'Do not put provider API keys or tunnel secrets in the public frontend',
    ],
    recent_logs: tunnelState.logs,
  };
}

function nextDoctorAction(checks = []) {
  const first = checks.find(check => check.state !== 'ready');
  if (!first) {
    return {
      id: 'ready',
      title: 'Local AI path is ready',
      detail: 'Connector, pairing, Ollama and at least one model are ready.',
      primary: 'Chat now',
      target: '#mimir-prompt',
    };
  }
  if (first.id === 'ollama') {
    return {
      id: 'start-ollama',
      title: 'Start Ollama',
      detail: 'Start Ollama or rerun the free local connector installer.',
      primary: 'Local connector',
      target: '#local-connector',
    };
  }
  if (first.id === 'model-pull') {
    return {
      id: 'repair-model-pull',
      title: 'Repair model install',
      detail: first.detail,
      primary: 'Model library',
      target: '#model-library',
    };
  }
  if (first.id === 'model') {
    return {
      id: 'install-model',
      title: 'Install a free local model',
      detail: 'Choose a small free Ollama model and let MMIR pull it through this paired local connector.',
      primary: 'Model library',
      target: '#model-library',
    };
  }
  return {
    id: 'review',
    title: 'Review local connector health',
    detail: first.detail || 'A local activation gate needs attention.',
    primary: 'Local connector',
    target: '#local-connector',
  };
}

function doctorReport({ runtime, models }) {
  const pulls = Array.from(modelPulls.values()).map(publicPullState);
  const profile = hardware();
  const runningPull = pulls.find(pull => ['running', 'queued', 'pulling'].includes(String(pull.status || pull.phase || '').toLowerCase()));
  const failedPull = pulls.find(pull => String(pull.status || '').toLowerCase() === 'failed');
  const runtimeOnline = runtime.status === 'online';
  const checks = [
    { id: 'connector', state: 'ready', label: 'Connector', detail: 'MMIR Local Connector is reachable.' },
    { id: 'pairing', state: 'ready', label: 'Pairing', detail: 'This browser has a local pairing token for protected routes.' },
    { id: 'ollama', state: runtimeOnline ? 'ready' : 'error', label: 'Ollama runtime', detail: runtimeOnline ? 'Ollama is online.' : 'Ollama is offline or not reachable from the connector.' },
    { id: 'model-pull', state: failedPull ? 'error' : (runningPull ? 'warn' : 'ready'), label: 'Model install', detail: failedPull ? `Last pull failed for ${failedPull.model || 'model'}.` : (runningPull ? `Pulling ${runningPull.model || 'model'} ${runningPull.percent || 0}%.` : 'No failed model pull jobs.') },
    { id: 'model', state: models.length ? 'ready' : 'warn', label: 'Model availability', detail: models.length ? `${models.length} local model(s) available.` : 'Install one free local model to activate private live chat.' },
    { id: 'hardware', state: 'ready', label: 'Hardware profile', detail: `${profile.cpu_count} CPU / ${profile.memory_gb} GB RAM.` },
    { id: 'tunnel', state: 'ready', label: 'Tunnel', detail: tunnelState.public_url ? `Tunnel online at ${tunnelState.public_url}.` : 'Tunnel is optional and stays disabled unless explicitly started.' },
  ];
  return {
    object: 'mmir.local_node_doctor',
    version: 1,
    status: checks.every(check => check.state === 'ready') ? 'ready' : 'needs_action',
    checks,
    next_action: nextDoctorAction(checks),
    model_count: models.length,
    pull_count: pulls.length,
    generated_at: new Date().toISOString(),
  };
}

function requestToken(req) {
  const header = req.headers['x-mmir-local-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function paired(req, res, origin) {
  const supplied = requestToken(req);
  if (!supplied || supplied.length !== TOKEN.length) {
    fail(res, 401, 'Pair with this local connector before using models or chat.', origin);
    return false;
  }
  const valid = crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(TOKEN));
  if (!valid) fail(res, 401, 'Pair with this local connector before using models or chat.', origin);
  return valid;
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > 512 * 1024) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function hardware() {
  const memoryGb = Math.round(os.totalmem() / 1024 / 1024 / 1024);
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpu_count: os.cpus().length,
    memory_gb: memoryGb,
    memory_tier: memoryGb >= 48 ? 'workstation' : memoryGb >= 16 ? 'medium' : memoryGb >= 8 ? 'entry' : 'small',
    recommended_model: MODEL,
    starter_models: [{ id: MODEL, label: MODEL, fit: 'recommended' }],
    warnings: memoryGb < 8 ? ['Low memory machine. Use the smallest starter model.'] : [],
  };
}

async function ollama(path, options = {}) {
  const response = await fetch(OLLAMA_URL + path, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs || 60000),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  return response.json();
}

function modelJobId(model) {
  return Buffer.from(String(model), 'utf8').toString('base64url').slice(0, 180);
}

function publicPullState(state) {
  if (!state) return null;
  return {
    id: state.id,
    model: state.model,
    status: state.status,
    phase: state.phase,
    completed: state.completed,
    total: state.total,
    percent: state.percent,
    started_at: state.started_at,
    updated_at: state.updated_at,
    finished_at: state.finished_at,
    error: state.error,
    last_event: state.last_event,
  };
}

function updatePullState(state, patch) {
  Object.assign(state, patch, { updated_at: new Date().toISOString() });
  if (typeof state.completed === 'number' && typeof state.total === 'number' && state.total > 0) {
    state.percent = Math.max(0, Math.min(100, Math.round((state.completed / state.total) * 100)));
  }
  modelPulls.set(state.id, state);
}

function modelFromPayload(payload) {
  const model = String(payload?.model || payload?.name || '').trim();
  if (!/^[a-zA-Z0-9._:/-]{1,120}$/.test(model)) {
    return '';
  }
  return model;
}

async function runModelPull(state) {
  try {
    await ollama('/api/pull', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: state.model, stream: false }),
      timeoutMs: 15 * 60 * 1000,
    });
    updatePullState(state, {
      status: 'ready',
      phase: 'ready',
      percent: 100,
      finished_at: new Date().toISOString(),
      error: null,
    });
  } catch (error) {
    updatePullState(state, {
      status: 'failed',
      phase: 'failed',
      finished_at: new Date().toISOString(),
      error: error.message || 'Model pull failed.',
    });
  }
}

function createPairingCodeSession() {
  const code = String(crypto.randomInt(100000, 999999));
  const now = Date.now();
  const ttlMs = 10 * 60 * 1000;
  return {
    code,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
    expires_at_ms: now + ttlMs,
    ttl_seconds: Math.round(ttlMs / 1000),
    used: false,
  };
}

function completion(model, content, raw = {}) {
  return {
    id: `chatcmpl_mmir_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    provider: 'local-node',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: content || '' },
      finish_reason: raw.done_reason || 'stop',
    }],
    usage: {
      prompt_tokens: raw.prompt_eval_count || null,
      completion_tokens: raw.eval_count || null,
      total_tokens: null,
    },
  };
}

async function chat(req, res, origin) {
  if (!paired(req, res, origin)) return;
  const payload = await body(req);
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter(message => message && typeof message.content === 'string' && message.content.trim())
        .map(message => ({ role: message.role || 'user', content: message.content }))
    : [];

  if (!messages.length) {
    fail(res, 400, 'Messages must be a non-empty array.', origin);
    return;
  }

  const model = String(payload.model || MODEL);
  const data = await ollama('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  send(res, 200, completion(model, data?.message?.content || '', data), origin);
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

  if (!okOrigin(origin)) {
    fail(res, 403, 'Origin is not allowed.', origin);
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors(origin));
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, {
        status: 'online',
        service: 'mmir-local-node',
        version: VERSION,
        mode: 'local',
        timestamp: new Date().toISOString(),
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      let runtime;
      try {
        runtime = { provider: 'ollama', status: 'online', ...(await ollama('/api/version', { timeoutMs: 2500 })) };
      } catch {
        runtime = { provider: 'ollama', status: 'offline', reason: 'unreachable' };
      }
      send(res, 200, {
        status: runtime.status === 'online' ? 'online' : 'degraded',
        service: 'mmir-local-node',
        version: VERSION,
        provider: 'local-node',
        contract_version: CONTRACT_VERSION,
        runtime,
        pairing: { required: true, configured: true },
        node: nodeIdentity(),
        tunnel: {
          provider: tunnelState.provider,
          status: tunnelState.status,
          control_enabled: TUNNEL_CONTROL_ENABLED,
          public_url: tunnelState.public_url,
        },
        capabilities: nodeCapabilities(),
        limits: {
          max_messages: 64,
          max_prompt_chars: 24000,
          streaming: false,
          model_pull_idle_timeout_ms: 15 * 60 * 1000,
        },
        readiness: {
          node_online: true,
          ollama_online: runtime.status === 'online',
          paired_required: true,
          models_available: modelPulls.size > 0 || runtime.status === 'online',
          chat_ready: runtime.status === 'online',
        },
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/node/identity') {
      send(res, 200, nodeIdentity(), origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/doctor') {
      if (!paired(req, res, origin)) return;
      let runtime;
      let models = [];
      try {
        runtime = { provider: 'ollama', status: 'online', ...(await ollama('/api/version', { timeoutMs: 2500 })) };
      } catch {
        runtime = { provider: 'ollama', status: 'offline', reason: 'unreachable' };
      }
      if (runtime.status === 'online') {
        try {
          const tags = await ollama('/api/tags', { timeoutMs: 8000 });
          models = Array.isArray(tags.models) ? tags.models : [];
        } catch {
          models = [];
        }
      }
      send(res, 200, doctorReport({ runtime, models }), origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/tunnels/status') {
      if (paired(req, res, origin)) send(res, 200, tunnelPayload(), origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/tunnels/trycloudflare/start') {
      if (!paired(req, res, origin)) return;
      if (!TUNNEL_CONTROL_ENABLED) {
        fail(res, 403, 'Tunnel control is disabled. Restart MMIR Local Connector with MMIR_ENABLE_TUNNEL_CONTROL=true after installing cloudflared.', origin);
        return;
      }
      if (tunnelState.process && !tunnelState.process.killed) {
        send(res, 200, tunnelPayload(), origin);
        return;
      }

      tunnelState.status = 'starting';
      tunnelState.error = null;
      tunnelState.public_url = null;
      tunnelState.started_at = new Date().toISOString();
      tunnelState.logs = [];
      tunnelState.process = spawn('cloudflared', ['tunnel', '--url', TUNNEL_LOCAL_URL], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      tunnelState.process.stdout.on('data', chunk => appendTunnelLog(chunk.toString('utf8')));
      tunnelState.process.stderr.on('data', chunk => appendTunnelLog(chunk.toString('utf8')));
      tunnelState.process.on('error', error => {
        tunnelState.status = 'unavailable';
        tunnelState.error = error.code === 'ENOENT' ? 'cloudflared is not installed or not on PATH.' : error.message;
        tunnelState.process = null;
      });
      tunnelState.process.on('exit', code => {
        tunnelState.status = code === 0 ? 'stopped' : 'error';
        tunnelState.error = code === 0 ? null : `cloudflared exited with code ${code}.`;
        tunnelState.process = null;
      });
      send(res, 200, tunnelPayload(), origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/tunnels/stop') {
      if (!paired(req, res, origin)) return;
      if (tunnelState.process && !tunnelState.process.killed) tunnelState.process.kill();
      tunnelState.status = TUNNEL_CONTROL_ENABLED ? 'stopped' : 'disabled';
      tunnelState.public_url = null;
      tunnelState.error = null;
      tunnelState.process = null;
      send(res, 200, tunnelPayload(), origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/pair') {
      send(res, 200, {
        paired: true,
        service: 'mmir-local-node',
        version: VERSION,
        token: TOKEN,
        header: 'x-mmir-local-token',
        required: true,
      }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/pairing/sessions') {
      const session = createPairingCodeSession();
      remotePairingSession = session;
      send(res, 200, {
        created: true,
        code: session.code,
        expires_at: session.expires_at,
        ttl_seconds: session.ttl_seconds,
        use_with: 'POST /pair with {"code":"<code>"} on a trusted tunnel or future control-plane URL.',
        security: [
          'Code is one-time and short-lived.',
          'Only create it on the device running MMIR Local Connector.',
          'Do not paste pairing codes into public issues or chats.',
        ],
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/hardware') {
      if (paired(req, res, origin)) send(res, 200, hardware(), origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/models') {
      if (!paired(req, res, origin)) return;
      const tags = await ollama('/api/tags', { timeoutMs: 8000 });
      send(res, 200, {
        object: 'list',
        provider: 'local-node',
        source: 'ollama',
        hardware: hardware(),
        data: (tags.models || []).map(model => ({
          id: model.name || model.model,
          name: model.name || model.model,
          provider: 'ollama',
          status: 'available',
          source: 'local',
          capabilities: ['chat'],
        })),
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/models/pulls') {
      if (!paired(req, res, origin)) return;
      send(res, 200, {
        object: 'list',
        provider: 'local-node',
        source: 'ollama',
        data: Array.from(modelPulls.values()).map(publicPullState),
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/models/pulls/')) {
      if (!paired(req, res, origin)) return;
      const id = decodeURIComponent(url.pathname.slice('/models/pulls/'.length));
      const state = modelPulls.get(id);
      if (!state) {
        fail(res, 404, 'Model pull job was not found.', origin);
        return;
      }
      send(res, 200, publicPullState(state), origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/models/pull') {
      if (!paired(req, res, origin)) return;
      const payload = await body(req);
      const model = modelFromPayload(payload);
      if (!model) {
        fail(res, 400, 'A valid Ollama model name is required.', origin);
        return;
      }
      const id = modelJobId(model);
      const existing = modelPulls.get(id);
      if (existing && existing.status === 'running') {
        send(res, 202, publicPullState(existing), origin);
        return;
      }
      const state = {
        id,
        model,
        status: 'running',
        phase: 'queued',
        completed: null,
        total: null,
        percent: null,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finished_at: null,
        error: null,
        last_event: null,
      };
      modelPulls.set(id, state);
      runModelPull(state);
      send(res, 202, publicPullState(state), origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/models/delete') {
      if (!paired(req, res, origin)) return;
      const payload = await body(req);
      const model = modelFromPayload(payload);
      if (!model) {
        fail(res, 400, 'A valid Ollama model name is required.', origin);
        return;
      }
      await ollama('/api/delete', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: model }),
        timeoutMs: 30000,
      });
      send(res, 200, {
        deleted: true,
        model,
        provider: 'local-node',
        source: 'ollama',
      }, origin);
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/chat/completions' || url.pathname === '/chat')) {
      await chat(req, res, origin);
      return;
    }

    fail(res, 404, 'Route not found.', origin);
  } catch (error) {
    fail(res, 503, error.message || 'Local connector failed.', origin);
  }
}).listen(PORT, HOST, () => {
  console.log(`MMIR Local Connector listening on http://${HOST}:${PORT}`);
});
