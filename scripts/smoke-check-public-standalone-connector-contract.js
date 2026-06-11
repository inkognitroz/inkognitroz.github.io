#!/usr/bin/env node
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const serverPath = join(root, 'public', 'downloads', 'mmir-local-connector-server.mjs');
const token = 'test-local-pairing-token';
const model = 'gemma3:270m';
const failures = [];
let fakeOllama;
let connector;
let tempDir;

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function listen(server, port = 0) {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolveListen(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => {
    if (!server) {
      resolveClose();
      return;
    }
    server.close(() => resolveClose());
  });
}

async function freePort() {
  const probe = http.createServer();
  const port = await listen(probe);
  await closeServer(probe);
  return port;
}

function sendJson(res, code, payload) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function startFakeOllama() {
  fakeOllama = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/api/version') {
      sendJson(res, 200, { version: '0.0.0-test' });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/tags') {
      sendJson(res, 200, {
        models: [{
          name: model,
          model,
          modified_at: '2026-06-11T00:00:00Z',
          size: 123456,
        }],
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      sendJson(res, 200, {
        model,
        done: true,
        message: { role: 'assistant', content: 'hello from local test connector' },
        eval_count: 4,
        prompt_eval_count: 3,
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/pull') {
      sendJson(res, 200, { status: 'success' });
      return;
    }
    sendJson(res, 404, { error: 'not_found' });
  });
  return listen(fakeOllama);
}

async function requestJson(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      origin: 'https://mmir.ai',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function waitForHealth(port) {
  const deadline = Date.now() + 8000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await requestJson(port, '/health');
      if (response.status === 200) return response.body;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
  }
  throw lastError || new Error('connector health did not become ready');
}

async function startConnector(ollamaPort) {
  tempDir = mkdtempSync(join(tmpdir(), 'mmir-standalone-contract-'));
  const tokenFile = join(tempDir, 'pairing-token');
  const modelFile = join(tempDir, 'default-model');
  writeFileSync(tokenFile, `${token}\n`);
  writeFileSync(modelFile, `${model}\n`);
  const port = await freePort();
  connector = spawn(process.execPath, [serverPath], {
    cwd: root,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      OLLAMA_URL: `http://127.0.0.1:${ollamaPort}`,
      MMIR_PAIRING_TOKEN_FILE: tokenFile,
      MMIR_DEFAULT_MODEL_FILE: modelFile,
      MMIR_ENABLE_TUNNEL_CONTROL: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  connector.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
  connector.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
  connector.on('exit', (code) => {
    if (code !== null && code !== 0 && !failures.length) {
      fail(`connector exited early with ${code}: ${output}`);
    }
  });
  await waitForHealth(port);
  return port;
}

async function run() {
  const ollamaPort = await startFakeOllama();
  const connectorPort = await startConnector(ollamaPort);

  const unpairedStatus = await requestJson(connectorPort, '/status');
  assert(unpairedStatus.status === 200, 'unpaired /status should be public-safe 200.');
  assert(unpairedStatus.body?.model_summary?.visibility === 'public-safe', 'unpaired /status must keep model summary public-safe.');
  assert(Array.isArray(unpairedStatus.body?.model_summary?.data) && unpairedStatus.body.model_summary.data.length === 0, 'unpaired /status must hide model metadata.');
  assert(unpairedStatus.body?.route_telemetry?.object === 'mmir.local.route_telemetry.list', 'unpaired /status should expose telemetry envelope.');
  assert(unpairedStatus.body?.route_telemetry?.route_count === 0, 'unpaired telemetry must not reveal local model routes.');
  assert(!JSON.stringify(unpairedStatus.body).includes(model), 'unpaired /status must not leak model names.');

  const unpairedContract = await requestJson(connectorPort, '/node/contract');
  assert(unpairedContract.status === 401, 'unpaired /node/contract must require pairing.');

  const pair = await requestJson(connectorPort, '/pair', { method: 'POST' });
  assert(pair.status === 200 && pair.body?.token === token, '/pair should return the local pairing token.');

  const headers = { 'x-mmir-local-token': token };
  const pairedStatus = await requestJson(connectorPort, '/status', { headers });
  assert(pairedStatus.status === 200, 'paired /status should be 200.');
  assert(pairedStatus.body?.model_summary?.visibility === 'paired', 'paired /status must mark model metadata as paired.');
  assert(pairedStatus.body?.route_telemetry?.object === 'mmir.local.route_telemetry.list', 'paired /status must include route telemetry list.');
  assert(pairedStatus.body?.route_telemetry?.route_count === 1, 'paired /status must include one local route.');
  assert(pairedStatus.body?.route_telemetry?.data?.[0]?.model_id === model, 'paired route telemetry must include the local model id.');

  const contract = await requestJson(connectorPort, '/node/contract', { headers });
  assert(contract.status === 200, 'paired /node/contract should be 200.');
  assert(contract.body?.object === 'mmir.node.contract', '/node/contract must return mmir.node.contract.');
  assert(contract.body?.compatibility?.repo_connector_contract_parity === true, '/node/contract must advertise repo connector parity.');
  assert(contract.body?.route_telemetry?.object === 'mmir.local.route_telemetry.list', '/node/contract must include route telemetry.');
  assert(contract.body?.pairing?.paired === true, '/node/contract must confirm paired state.');

  const chat = await requestJson(connectorPort, '/v1/chat/completions', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }] }),
  });
  assert(chat.status === 200, 'paired chat completion should be 200.');
  assert(chat.body?.choices?.[0]?.message?.content === 'hello from local test connector', 'paired chat should return fake Ollama content.');

  const telemetry = await requestJson(connectorPort, '/telemetry/routes', { headers });
  assert(telemetry.status === 200, 'paired /telemetry/routes should be 200.');
  assert(telemetry.body?.object === 'mmir.local.route_telemetry.list', '/telemetry/routes must return route telemetry list.');
  assert(telemetry.body?.data?.[0]?.ranking_signals?.latency_sample_count >= 1, 'route telemetry must record observed chat latency samples.');
  assert(telemetry.body?.privacy?.no_prompts === true && telemetry.body?.privacy?.no_answers === true, 'route telemetry must be metadata-only.');
}

try {
  await run();
} finally {
  if (connector && !connector.killed) connector.kill();
  await closeServer(fakeOllama);
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error('public standalone connector contract smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('public standalone connector contract smoke passed.');
