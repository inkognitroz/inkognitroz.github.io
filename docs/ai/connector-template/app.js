/**
 * Mimir backend connector template
 *
 * Implements the Mimir connector contract:
 *   GET  /health   — liveness check
 *   GET  /models   — list available models
 *   POST /chat     — accept a chat request and return a response
 *   GET  /metrics  — lightweight performance counters (optional)
 *
 * Supported providers (set via PROVIDER env var):
 *   ollama         — local or VM-hosted Ollama
 *   openai-compat  — any OpenAI-compatible API (OpenAI, Together, Groq, etc.)
 *
 * All credentials are read from environment variables.
 * Never hard-code API keys or secrets in this file.
 */

'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ── Configuration (read from environment, never from request) ────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);
const PROVIDER = process.env.PROVIDER || 'ollama';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama3.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ── Metrics counters ─────────────────────────────────────────────────────────

const startTime = Date.now();
let requestsTotal = 0;
let errorsTotal = 0;
let totalLatencyMs = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonFetch(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;
    const body = options.body ? Buffer.from(options.body, 'utf8') : null;
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': body.length } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
          } catch {
            resolve({ status: res.statusCode, body: {} });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

// ── Provider adapters ────────────────────────────────────────────────────────

async function ollamaModels() {
  const result = await jsonFetch(`${OLLAMA_BASE_URL}/api/tags`);
  const models = (result.body.models || []).map((m) => ({
    id: m.name,
    label: m.name,
    family: m.name.split(':')[0],
  }));
  return models.length ? models : [{ id: DEFAULT_MODEL, label: DEFAULT_MODEL, family: DEFAULT_MODEL.split(':')[0] }];
}

async function ollamaChat(model, messages, options) {
  const t0 = Date.now();
  const result = await jsonFetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({ model, messages, stream: false, options }),
  });
  const latency_ms = Date.now() - t0;
  const msg = result.body.message || {};
  return {
    model,
    provider: 'ollama',
    content: msg.content || '',
    usage: {
      input_tokens: result.body.prompt_eval_count || 0,
      output_tokens: result.body.eval_count || 0,
    },
    latency_ms,
  };
}

async function openaiModels() {
  if (!OPENAI_API_KEY) return [{ id: DEFAULT_MODEL, label: DEFAULT_MODEL, family: 'custom' }];
  const result = await jsonFetch(`${OPENAI_BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  return (result.body.data || []).slice(0, 20).map((m) => ({
    id: m.id,
    label: m.id,
    family: m.id.split('-')[0],
  }));
}

async function openaiChat(model, messages, options) {
  const t0 = Date.now();
  const result = await jsonFetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages, ...(options || {}) }),
  });
  const latency_ms = Date.now() - t0;
  const choice = (result.body.choices || [])[0] || {};
  const usage = result.body.usage || {};
  return {
    model,
    provider: 'openai-compat',
    content: (choice.message || {}).content || '',
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
    },
    latency_ms,
  };
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function handleHealth(req, res) {
  send(res, 200, {
    status: 'ok',
    provider: PROVIDER,
    timestamp: new Date().toISOString(),
  });
}

async function handleModels(req, res) {
  try {
    const models = PROVIDER === 'ollama' ? await ollamaModels() : await openaiModels();
    send(res, 200, { models });
  } catch (err) {
    send(res, 502, { error: 'Failed to fetch models from provider', detail: err.message });
  }
}

async function handleChat(req, res) {
  const body = await parseBody(req);
  const model = String(body.model || DEFAULT_MODEL);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const options = body.options || {};

  if (!messages.length) {
    send(res, 400, { error: 'messages array is required' });
    return;
  }

  const t0 = Date.now();
  requestsTotal++;
  try {
    const reply = PROVIDER === 'ollama'
      ? await ollamaChat(model, messages, options)
      : await openaiChat(model, messages, options);
    totalLatencyMs += reply.latency_ms;
    send(res, 200, reply);
  } catch (err) {
    errorsTotal++;
    totalLatencyMs += Date.now() - t0;
    send(res, 502, { error: 'Provider request failed', detail: err.message });
  }
}

async function handleMetrics(req, res) {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const avgLatencyMs = requestsTotal > 0 ? Math.round(totalLatencyMs / requestsTotal) : 0;
  send(res, 200, {
    uptime_seconds: uptimeSeconds,
    requests_total: requestsTotal,
    errors_total: errorsTotal,
    avg_latency_ms: avgLatencyMs,
    error_rate: requestsTotal > 0 ? errorsTotal / requestsTotal : 0,
  });
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && pathname === '/health') return await handleHealth(req, res);
    if (req.method === 'GET' && pathname === '/models') return await handleModels(req, res);
    if (req.method === 'POST' && pathname === '/chat') return await handleChat(req, res);
    if (req.method === 'GET' && pathname === '/metrics') return await handleMetrics(req, res);
    send(res, 404, { error: 'Not found' });
  } catch (err) {
    send(res, 500, { error: 'Internal server error', detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Mimir connector listening on port ${PORT} (provider: ${PROVIDER})`);
});
