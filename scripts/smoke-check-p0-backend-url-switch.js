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

// 9. The version literal is pinned in four places. Changing the helper without moving all
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

console.log('P0 backend URL switch check passed: off by default, two flag sources, fifteen rejected values, version pinned in four places.');
