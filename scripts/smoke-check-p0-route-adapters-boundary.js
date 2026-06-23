import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-route-adapters.js'), 'utf8');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidPattern(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

requireIncludes(helper, "version='20260611-b0-06-21-active-local-attach-v1'", 'P0 route adapter helper version must be explicit.');
requireIncludes(helper, 'window.MimirP0RouteAdapters', 'P0 route adapter helper must expose a stable public helper object.');
requireIncludes(helper, 'targetAddressSpace=\'loopback\'', 'P0 route adapter helper must own Local Network Access loopback hints.');
requireIncludes(helper, 'provider_secrets_in_browser:false', 'P0 route adapter helper must publish no-secret evidence.');
requireIncludes(shell, 'const P0_ROUTE_ADAPTERS=window.MimirP0RouteAdapters||{};', 'P0 shell must read the route adapter helper.');
requireIncludes(shell, 'const fetchJson=P0_ROUTE_ADAPTERS.fetchJson;', 'P0 shell must delegate JSON transport to the route adapter helper.');
requireIncludes(shell, 'const pairLocal=P0_ROUTE_ADAPTERS.pairLocal;', 'P0 shell must delegate local pairing to the route adapter helper.');
requireIncludes(shell, 'const localHeaders=P0_ROUTE_ADAPTERS.localHeaders;', 'P0 shell must delegate local auth headers to the route adapter helper.');
requireIncludes(shell, 'const localNetworkHint=P0_ROUTE_ADAPTERS.localNetworkHint;', 'P0 shell must delegate local error guidance to the route adapter helper.');
requireIncludes(shell, 'const allowLocalProbes=P0_ROUTE_ADAPTERS.allowLocalProbes;', 'P0 shell must delegate local probe gating to the route adapter helper.');
requireIncludes(shell, 'const hasLocalPairingToken=P0_ROUTE_ADAPTERS.hasLocalPairingToken', 'P0 shell must delegate local pairing-token presence checks to the route adapter helper.');
forbidPattern(shell, /function fetchOptions\s*\(/, 'P0 shell must not own low-level fetch options.');
forbidPattern(shell, /async function fetchJson\s*\(/, 'P0 shell must not own low-level JSON transport.');
forbidPattern(shell, /async function pairLocal\s*\(/, 'P0 shell must not own local pairing.');
forbidPattern(shell, /function localHeaders\s*\(/, 'P0 shell must not own local auth headers.');
forbidPattern(shell, /function localNetworkHint\s*\(/, 'P0 shell must not own local network error copy.');
forbidPattern(shell, /function allowLocalProbes\s*\(/, 'P0 shell must not own local probe gating.');
forbidPattern(shell, /function hasLocalPairingToken\s*\(/, 'P0 shell must not own local pairing-token storage checks.');
requireIncludes(html, 'p0-route-adapters.js?v=20260611-b0-06-21-active-local-attach-v1', 'mmir.html must load the route adapter helper with cache busting.');
requireIncludes(html, 'p0-chat-shell.js?v=20260624-council-cta-v1', 'mmir.html must cache-bust the P0 shell for the adapter-boundary slice.');
if (html.indexOf('p0-route-adapters.js?v=20260611-b0-06-21-active-local-attach-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 route adapter helper must load before the P0 shell.');
}
requireIncludes(manifest, '"p0-route-adapters.js": "20260611-b0-06-21-active-local-attach-v1"', 'Asset manifest must track p0-route-adapters.js.');
requireIncludes(manifest, '"p0-chat-shell.js": "20260624-council-cta-v1"', 'Asset manifest must track the P0 shell adapter-boundary version.');
requireIncludes(String(packageJson.scripts?.check || ''), 'smoke-check-p0-route-adapters-boundary.js', 'npm run check must include the P0 route adapter boundary smoke.');
forbidPattern(helper + shell, /OPENROUTER_API_KEY|CLOUDFLARE_API_TOKEN|BEGIN PRIVATE KEY|cash[- ]?out|token trading/i, 'Public route adapter boundary must not expose secrets or economic claims.');

const events = [];
const storage = new Map();
let lastFetch = null;
const context = {
  window: {},
  location: { hostname: 'staging.mmir.ai', href: 'https://staging.mmir.ai/mmir.html' },
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
  fetch: async (url, init) => {
    lastFetch = { url, init };
    return {
      ok: true,
      status: 200,
      json: async () => String(url).endsWith('/pair') ? { token: 'local-test-token' } : { ok: true }
    };
  }
};
context.window = {
  addEventListener() {},
  dispatchEvent(event) {
    events.push(event);
  },
  MimirAllowLocalProbes(reason, durationMs) {
    events.push({ type: 'local-probe', detail: { reason, durationMs } });
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(helper, context, { filename: 'p0-route-adapters.js' });

const api = context.window.MimirP0RouteAdapters;
if (!api || api.version !== '20260611-b0-06-21-active-local-attach-v1') fail('P0 route adapter helper must register on window.');
if (events[0]?.type !== 'mimir-p0-route-adapters-ready') fail('P0 route adapter helper must emit readiness evidence.');
if (api.config().apiUrl !== 'https://api-staging.mmir.ai') fail('P0 route adapter helper must select staging API on staging.mmir.ai.');
if (api.fetchOptions('http://127.0.0.1:3000/health', {}).targetAddressSpace !== 'loopback') fail('P0 route adapter helper must mark loopback fetches.');
if (api.localHeaders('abc')['x-mmir-local-token'] !== 'abc') fail('P0 route adapter helper must build local connector headers.');
await api.fetchJson('http://127.0.0.1:3000/health', { timeoutMs: 1000 });
if (lastFetch?.init?.targetAddressSpace !== 'loopback') fail('P0 route adapter helper fetchJson must apply loopback fetch options.');
const token = await api.pairLocal();
if (token !== 'local-test-token') fail('P0 route adapter helper must pair local connector and return the token.');
if (!api.hasLocalPairingToken()) fail('P0 route adapter helper must expose paired-token presence without leaking the token.');
api.allowLocalProbes('smoke', 123);
if (!events.some((event) => event.type === 'local-probe' && event.detail.reason === 'smoke')) fail('P0 route adapter helper must forward local probe activation.');
if (!/Allow Local Network Access/.test(api.localNetworkHint(new Error('Failed to fetch')))) fail('P0 route adapter helper must return useful local network guidance.');

if (failures.length) {
  console.error('P0 route adapter boundary smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 route adapter boundary smoke passed.');
