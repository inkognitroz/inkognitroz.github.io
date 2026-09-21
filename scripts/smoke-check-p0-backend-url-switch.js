#!/usr/bin/env node
// Backend-layer URL switch (ADR 0013), off by default.
//
// The contract this guards is narrow on purpose: with no flag set, the public shell must
// resolve exactly the URL it resolved before the switch existed. Everything else here is
// about making sure a flag can only ever point at a safe origin.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const apiClient = readFileSync(join(portalDir, 'api-client.js'), 'utf8');
const helper = readFileSync(join(portalDir, 'p0-route-adapters.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const assetVersions = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const failures = [];
const fail = (message) => failures.push(message);

function loadAdapter({ hostname = 'mmir.ai', windowExtras = {} } = {}) {
  const events = [];
  const storage = new Map();
  const context = {
    window: {
      addEventListener() {},
      dispatchEvent(event) {
        events.push(event);
      },
      location: { hostname, href: `https://${hostname}/mmir.html` },
      ...windowExtras
    },
    location: { hostname, href: `https://${hostname}/mmir.html` },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    },
    sessionStorage: {
      getItem(key) {
        return storage.get(key) || '';
      },
      setItem(key, value) {
        storage.set(key, String(value));
      }
    },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) })
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(apiClient, context, { filename: 'api-client.js' });
  vm.runInContext(helper, context, { filename: 'p0-route-adapters.js' });
  return { api: context.window.MimirP0RouteAdapters, events };
}

// 1. The switch is off by default. This is the whole point of the change: users see no
//    difference until someone sets a flag.
const prod = loadAdapter({ hostname: 'mmir.ai' });
if (!prod.api) fail('Route adapter helper must register on window.');
if (prod.api.config().apiUrl !== 'https://api.mmir.ai') {
  fail(`Default apiUrl on mmir.ai must stay https://api.mmir.ai, got ${prod.api.config().apiUrl}`);
}
if (prod.api.config().apiUrlSource !== 'host-default') {
  fail('Default resolution must report apiUrlSource host-default.');
}
if (prod.api.config().apiLabel !== 'api.mmir.ai') fail('Default apiLabel must stay api.mmir.ai.');

const staging = loadAdapter({ hostname: 'staging.mmir.ai' });
if (staging.api.config().apiUrl !== 'https://api-staging.mmir.ai') {
  fail('Default apiUrl on staging.mmir.ai must stay https://api-staging.mmir.ai.');
}

// 2. Readiness evidence announces that the switch exists, without claiming it is on.
if (prod.events[0]?.detail?.backend_url_switch_available !== true) {
  fail('Route adapter readiness must publish backend_url_switch_available.');
}
if (prod.events[0]?.detail?.no_paid_routes_started !== true) {
  fail('Route adapter readiness must keep publishing no_paid_routes_started.');
}

// 3. The global flag switches the base URL, and the label follows it.
const flagged = loadAdapter({ windowExtras: { MMIR_BACKEND_URL: 'https://backend.mmir.ai' } });
const flaggedConfig = flagged.api.config();
if (flaggedConfig.apiUrl !== 'https://backend.mmir.ai') fail('MMIR_BACKEND_URL must switch the base URL.');
if (flaggedConfig.apiLabel !== 'backend.mmir.ai') fail('apiLabel must follow the switched base URL.');
if (flaggedConfig.apiUrlSource !== 'flag:global') fail('Global flag must report apiUrlSource flag:global.');

// 4. Brand config is the second source, so a brand can be a config change rather than a fork.
const branded = loadAdapter({ windowExtras: { MimirBrandConfig: { backend_url: 'https://backend.mmir.ai' } } });
if (branded.api.config().apiUrl !== 'https://backend.mmir.ai') fail('Brand config backend_url must switch the base URL.');
if (branded.api.config().apiUrlSource !== 'flag:brand') fail('Brand flag must report apiUrlSource flag:brand.');

// 5. The global flag wins over brand config.
const both = loadAdapter({
  windowExtras: {
    MMIR_BACKEND_URL: 'https://backend.mmir.ai',
    MimirBrandConfig: { backend_url: 'https://other.example' }
  }
});
if (both.api.config().apiUrl !== 'https://backend.mmir.ai') fail('Global flag must take precedence over brand config.');

// 6. Fail closed. A rejected value must fall back to the host default, never to a partial
//    or downgraded URL. A public shell that honoured any of these would be a way to point
//    a user's traffic somewhere the owner never chose.
const rejected = [
  ['http://backend.mmir.ai', 'plain http on a non-loopback host'],
  ['javascript:alert(1)', 'javascript: scheme'],
  ['//backend.mmir.ai', 'protocol-relative URL'],
  ['/backend', 'relative path'],
  ['https://user:pass@backend.mmir.ai', 'embedded credentials'],
  ['https://backend.mmir.ai/v1', 'a path beyond the origin'],
  ['https://backend.mmir.ai?x=1', 'a query string'],
  ['https://backend.mmir.ai#f', 'a fragment'],
  ['ftp://backend.mmir.ai/', 'a non-http scheme with an origin-only path'],
  ['file:///', 'the file: scheme'],
  ['ws://backend.mmir.ai/', 'the ws: scheme'],
  ['   ', 'whitespace'],
  ['', 'empty string'],
  [42, 'a non-string'],
  [null, 'null']
];
for (const [value, why] of rejected) {
  const probe = loadAdapter({ windowExtras: { MMIR_BACKEND_URL: value } });
  const resolved = probe.api.config();
  if (resolved.apiUrl !== 'https://api.mmir.ai' || resolved.apiUrlSource !== 'host-default') {
    fail(`Backend URL flag must reject ${why} and fall back to the host default, got ${resolved.apiUrl}`);
  }
}

// 6b. An accepted value is normalised to a bare origin. Without this the shell builds
//     `https://backend.mmir.ai//status` from a trailing slash, and a mixed-case or
//     default-port spelling produces two different labels for one host.
for (const [input, expected, why] of [
  ['https://backend.mmir.ai/', 'https://backend.mmir.ai', 'a trailing slash must be dropped'],
  ['  https://backend.mmir.ai  ', 'https://backend.mmir.ai', 'surrounding whitespace must be trimmed'],
  ['https://BACKEND.MMIR.AI', 'https://backend.mmir.ai', 'the host must be lower-cased'],
  ['https://backend.mmir.ai:443', 'https://backend.mmir.ai', 'the default https port must be dropped']
]) {
  const probe = loadAdapter({ windowExtras: { MMIR_BACKEND_URL: input } });
  const resolved = probe.api.config().apiUrl;
  if (resolved !== expected) fail(`Backend URL normalisation: ${why} (${JSON.stringify(input)} -> ${resolved})`);
}

// 7. config() and apiUrlForCurrentHost() are two exported ways to ask the same question.
//    They must never answer differently, or a caller's base URL depends on which one it used.
for (const [label, extras, hostname] of [
  ['no flag', {}, 'mmir.ai'],
  ['no flag on staging', {}, 'staging.mmir.ai'],
  ['global flag', { MMIR_BACKEND_URL: 'https://backend.mmir.ai' }, 'mmir.ai'],
  ['brand flag', { MimirBrandConfig: { backend_url: 'https://backend.mmir.ai' } }, 'mmir.ai'],
  ['rejected flag', { MMIR_BACKEND_URL: 'http://backend.mmir.ai' }, 'mmir.ai']
]) {
  const probe = loadAdapter({ hostname, windowExtras: extras });
  const viaConfig = probe.api.config().apiUrl;
  const viaHelper = probe.api.apiUrlForCurrentHost();
  if (viaConfig !== viaHelper) {
    fail(`config() and apiUrlForCurrentHost() disagree with ${label}: ${viaConfig} vs ${viaHelper}`);
  }
}

// 8. Loopback http stays usable for local development.
const local = loadAdapter({ windowExtras: { MMIR_BACKEND_URL: 'http://127.0.0.1:3001' } });
if (local.api.config().apiUrl !== 'http://127.0.0.1:3001') fail('Loopback http must remain allowed for local development.');

function identityProbe({ stored = {}, now = Date.parse('2026-09-21T00:00:00.000Z'), storageSetError = false, responder } = {}) {
  const storage = new Map(Object.entries(stored));
  const calls = [];
  const events = [];
  class FixedDate extends Date { static now() { return now; } }
  const response = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return responder({ url: String(url), init, calls, response });
  };
  const context = {
    window: {
      MMIR_BACKEND_URL: 'https://backend.mmir.ai',
      location: { hostname: 'mmir.ai', href: 'https://mmir.ai/mmir.html' },
      addEventListener() {}, dispatchEvent(event) { events.push(event); },
      sessionStorage: { getItem(key) { return storage.has(key) ? storage.get(key) : null; }, setItem(key, value) { if (storageSetError) throw new Error('storage denied'); storage.set(key, String(value)); } },
      fetch: fetchImpl
    },
    location: { hostname: 'mmir.ai', href: 'https://mmir.ai/mmir.html' }, URL, Date: FixedDate,
    AbortController, setTimeout, clearTimeout,
    CustomEvent: function CustomEvent(type, init = {}) { this.type = type; this.detail = init.detail; },
    fetch: fetchImpl
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(apiClient, context, { filename: 'api-client.js' });
  vm.runInContext(helper, context, { filename: 'p0-route-adapters.js' });
  return { api: context.window.MimirP0RouteAdapters, calls, storage, events, sessionKey: 'mimir-backend-identity-session:https://backend.mmir.ai' };
}

const healthPayload = { status: 'online', service: 'mmir-orchestrator', layer: 'backend', capabilities: ['identity', 'proxy.chat_completions'], ordering_authority: 'unbound' };
const sessionPayload = (token, identity = 'identity-a', expires = '2026-09-22T00:00:00.000Z') => ({ object: 'mmir.identity_session', anonymous: true, token, identity_id: identity, issued_at: '2026-09-21T00:00:00.000Z', expires_at: expires });
const backendResponder = ({ session = sessionPayload('token-a'), sessionStatus = 200, health = healthPayload } = {}) => ({ url, response }) => {
  if (url.endsWith('/health')) return response(health);
  if (url.endsWith('/identity/session')) return response(session, sessionStatus);
  return response({ ok: true });
};

// 9. Identity is opt-in only: default status/chat calls keep their old URL and headers.
const noFlag = loadAdapter({ hostname: 'mmir.ai' });
await noFlag.api.fetchJson('https://api.mmir.ai/status', { timeoutMs: 1000 });
if (noFlag.api.config().apiUrl !== 'https://api.mmir.ai') fail('No-flag path must stay on api.mmir.ai.');

// 10. First explicit backend chat checks health, bootstraps once and sends one bearer.
const first = identityProbe({ responder: backendResponder() });
await first.api.fetchJson('https://backend.mmir.ai/v1/chat/completions', { method: 'POST', body: '{}', timeoutMs: 1000 });
if (first.calls.map(call => call.url).join('|') !== 'https://backend.mmir.ai/health|https://backend.mmir.ai/identity/session|https://backend.mmir.ai/v1/chat/completions') fail('First backend chat must health-check, bootstrap once, then send chat.');
if (first.calls[0].init.headers.Authorization || first.calls[1].init.headers.Authorization) fail('Health/session bootstrap calls must not carry a bearer.');
if (first.calls[2].init.headers.Authorization !== 'Bearer token-a') fail('Backend chat must carry the issued identity bearer.');
if (!first.storage.has(first.sessionKey)) fail('Issued backend identity must survive in tab session storage.');

// 11. Single-flight means concurrent first requests issue only one health/session pair.
const concurrent = identityProbe({ responder: async ({ url, response }) => { await new Promise(resolve => setTimeout(resolve, 1)); return url.endsWith('/health') ? response(healthPayload) : url.endsWith('/identity/session') ? response(sessionPayload('token-concurrent')) : response({ ok: true }); } });
await Promise.all([concurrent.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }), concurrent.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 })]);
if (concurrent.calls.filter(call => call.url.endsWith('/health')).length !== 1 || concurrent.calls.filter(call => call.url.endsWith('/identity/session')).length !== 1) fail('Concurrent backend requests must share one bootstrap flight.');

// 12. A valid near-expiry record rotates in place and preserves identity; failures retain it.
const nearExpiry = JSON.stringify(sessionPayload('old-token', 'identity-keep', '2026-09-21T01:00:00.000Z'));
const rotated = identityProbe({ stored: { 'mimir-backend-identity-session:https://backend.mmir.ai': nearExpiry }, responder: backendResponder({ session: sessionPayload('new-token', 'identity-keep') }) });
await rotated.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 });
if (rotated.calls.length !== 2 || !rotated.calls[0].url.endsWith('/identity/session') || rotated.calls[0].init.body !== JSON.stringify({ prior_token: 'old-token' })) fail('Near-expiry backend identity must rotate with prior_token and no health call.');
if (rotated.calls[1].init.headers.Authorization !== 'Bearer new-token') fail('Rotated backend identity must authorize the request.');
if (JSON.parse(rotated.storage.get(rotated.sessionKey)).identity_id !== 'identity-keep') fail('Identity rotation must preserve identity_id.');
const failedRotation = identityProbe({ stored: { 'mimir-backend-identity-session:https://backend.mmir.ai': nearExpiry }, responder: backendResponder({ session: { error: 'nope' }, sessionStatus: 503 }) });
try { await failedRotation.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }); fail('Failed rotation must throw.'); } catch (error) { if (error.code !== 'backend_identity_request_failed') fail('Failed rotation must expose a typed safe error.'); }
if (failedRotation.storage.get(failedRotation.sessionKey) !== nearExpiry) fail('Failed rotation must retain the prior session record.');

// 13. Malformed and expired records are fail-closed; neither may silently mint a replacement.
for (const [label, record, code] of [['malformed', '{"token":"only"}', 'backend_identity_malformed'], ['empty-malformed', '', 'backend_identity_malformed'], ['expired', JSON.stringify({ ...sessionPayload('expired', 'identity-expired', '2026-09-20T00:00:00.000Z'), issued_at: '2026-09-19T00:00:00.000Z' }), 'backend_identity_expired']]) {
  const probe = identityProbe({ stored: { 'mimir-backend-identity-session:https://backend.mmir.ai': record }, responder: backendResponder() });
  try { await probe.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }); fail(`${label} backend identity must throw.`); } catch (error) { if (error.code !== code) fail(`${label} backend identity must expose ${code}.`); }
  if (probe.calls.length) fail(`${label} backend identity must not call health/session.`);
}

const malformedResponse = identityProbe({ responder: backendResponder({ session: { token: 'not-enough-shape', identity_id: 'identity-a', issued_at: '2026-09-21T00:00:00.000Z', expires_at: '2026-09-22T00:00:00.000Z' } }) });
try { await malformedResponse.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }); fail('Malformed backend success must throw.'); } catch (error) { if (error.code !== 'backend_identity_invalid_response') fail('Malformed backend success must expose a typed safe error.'); }
if (malformedResponse.storage.has(malformedResponse.sessionKey)) fail('Malformed backend success must not be stored.');
const failedBootstrap = identityProbe({ responder: backendResponder({ session: { error: 'failed' }, sessionStatus: 503 }) });
try { await failedBootstrap.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }); fail('Failed bootstrap must throw.'); } catch (error) { if (error.message.includes('token-a')) fail('Identity tokens must not appear in bootstrap errors.'); }
if (failedBootstrap.calls.some(call => call.url.endsWith('/v1/chat/completions'))) fail('Failed bootstrap must not replay or send chat.');
const storageFailure = identityProbe({ storageSetError: true, responder: backendResponder() });
try { await storageFailure.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }); fail('Storage failure must throw.'); } catch (error) { if (error.code !== 'backend_identity_storage_unavailable') fail('Storage failure must be explicit.'); }
const storageCalls = storageFailure.calls.length;
try { await storageFailure.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 }); fail('Repeated storage failure must throw.'); } catch (error) { if (error.code !== 'backend_identity_storage_unavailable') fail('Repeated storage failure must stay explicit.'); }
if (storageFailure.calls.length !== storageCalls) fail('Storage failure must not mint a new identity on every request.');

// 14. Scope is exact: models, tools, api.mmir.ai and wrong origins never receive this bearer.
const scoped = identityProbe({ responder: backendResponder() });
await scoped.api.fetchJson('https://backend.mmir.ai/v1/models', { timeoutMs: 1000 });
await scoped.api.fetchJson('https://api.mmir.ai/status', { timeoutMs: 1000 });
await scoped.api.fetchJson('https://other.example/v1/chat/completions', { method: 'POST', body: '{}', timeoutMs: 1000 });
if (scoped.calls.some(call => call.init.headers?.Authorization)) fail('Out-of-scope destinations must never receive backend identity credentials.');
if (scoped.calls.length !== 3) fail('Out-of-scope requests must not trigger health/session calls.');

// 15. Abort propagates through health/bootstrap without replaying chat.
const abortController = new AbortController();
const aborted = identityProbe({ responder: ({ url, init }) => url.endsWith('/health') ? new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => { const error = new Error('aborted'); error.name = 'AbortError'; reject(error); }, { once: true }); }) : Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) }) });
const abortedPromise = aborted.api.fetchJson('https://backend.mmir.ai/status', { signal: abortController.signal, timeoutMs: 1000 }).catch(error => error);
abortController.abort();
const abortError = await abortedPromise;
if (abortError?.name !== 'AbortError' || aborted.calls.length !== 1 || aborted.calls.some(call => call.url.endsWith('/identity/session') || call.url.endsWith('/v1/chat/completions')) || aborted.storage.has(aborted.sessionKey)) fail('Sole backend caller abort must cancel bootstrap without replay or storage write.');
const mixedAbort = identityProbe({ responder: ({ url, init, response }) => url.endsWith('/health')
  ? new Promise(resolve => { setTimeout(() => resolve(response(healthPayload)), 5); })
  : url.endsWith('/identity/session') ? new Promise(resolve => { setTimeout(() => resolve(response(sessionPayload('token-mixed'))), 5); })
  : response({ ok: true }) });
const firstAbort = new AbortController();
const firstRequest = mixedAbort.api.fetchJson('https://backend.mmir.ai/status', { signal: firstAbort.signal, timeoutMs: 1000 }).catch(error => error);
await new Promise(resolve => setTimeout(resolve, 1));
const secondRequest = mixedAbort.api.fetchJson('https://backend.mmir.ai/status', { timeoutMs: 1000 });
firstAbort.abort();
const firstAbortError = await firstRequest;
await secondRequest;
if (firstAbortError?.name !== 'AbortError' || mixedAbort.calls.filter(call => call.url.endsWith('/identity/session')).length !== 1) fail('A joining backend request must survive another caller abort without duplicate bootstrap.');

// 16. The identity authority must execute before route adapters and the P0 shell; versions are pinned.
const apiVersion = assetVersions.assets?.['api-client.js'] || '';
if (!apiVersion || !html.includes(`api-client.js?v=${apiVersion}`)) fail('Public shell must load api-client.js with its manifest version.');
if (html.indexOf('api-client.js?v=') > html.indexOf('p0-route-adapters.js?v=')) fail('api-client.js must load before p0-route-adapters.js.');
if (html.indexOf('p0-route-adapters.js?v=') > html.indexOf('p0-chat-shell.js?v=')) fail('p0-route-adapters.js must load before p0-chat-shell.js.');

// 17. The version literal is pinned in four places. Changing the helper without moving all
//    four is the defect this check exists to make loud.
const helperVersion = (helper.match(/const version='([^']+)'/) || [])[1] || '';
const manifestVersion = assetVersions.assets?.['p0-route-adapters.js'] || '';
if (!helperVersion) fail('Route adapter helper must declare an explicit version.');
if (helperVersion !== manifestVersion) {
  fail(`Version drift: helper=${helperVersion} asset-versions.json=${manifestVersion}`);
}
if (!html.includes(`p0-route-adapters.js?v=${helperVersion}`)) {
  fail(`Public shell must load p0-route-adapters.js at version ${helperVersion}.`);
}

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-backend-url-switch.js')) {
  fail('npm run check must include the backend URL switch smoke.');
}

if (failures.length) {
  console.error('P0 backend URL switch check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 backend URL switch check passed: opt-in identity bootstrap/rotation, single-flight, fail-closed storage and exact destination scoping.');
