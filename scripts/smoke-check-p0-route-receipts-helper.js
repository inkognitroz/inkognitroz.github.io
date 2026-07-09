import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-route-receipts.js'), 'utf8');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertNoLeak(value, label) {
  const text = JSON.stringify(value || '');
  for (const needle of ['token=', 'api_key=', 'secret=', 'sk-live-leaky', 'ghp_leaky', 'user:pass@']) {
    if (text.includes(needle)) fail(`${label} must not leak ${needle}.`);
  }
}

if (!helper.includes("version='20260614-first-user-route-receipts-v1'")) {
  fail('P0 route receipts helper version must be explicit.');
}
if (!helper.includes("'Supergeni ready · hosted'")) {
  fail('P0 route receipts helper must own hosted route label copy.');
}
if (!helper.includes('private local') || !helper.includes('No provider key is stored in the browser')) {
  fail('P0 route receipts helper must own local and hosted receipt text.');
}
if (!helper.includes("displayName(model)+' · external free route'")) {
  fail('P0 route receipts helper must own external route receipt text.');
}
if (!helper.includes('hasUnsafeDisplayValue') || !helper.includes('safeRouteDisplayName')) {
  fail('P0 route receipts helper must sanitize route display names before rendering receipts.');
}
if (!shell.includes('const P0_ROUTE_RECEIPTS=window.MimirP0RouteReceipts||{};')) {
  fail('P0 shell must read shared route receipts helper.');
}
if (!shell.includes('P0_ROUTE_RECEIPTS.hostedRouteLabel(API_LABEL)')) {
  fail('P0 shell hosted route label must delegate to helper.');
}
if (!shell.includes('P0_ROUTE_RECEIPTS.receipt(model,{apiLabel:API_LABEL})')) {
  fail('P0 shell route receipts must delegate to helper.');
}
if (!html.includes('p0-route-receipts.js?v=20260614-first-user-route-receipts-v1')) {
  fail('Public MMIR shell must load p0-route-receipts.js with a cache-busted version.');
}
if (html.indexOf('p0-route-receipts.js?v=20260614-first-user-route-receipts-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 route receipts helper must load before the P0 shell.');
}
if (!manifest.includes('"p0-route-receipts.js": "20260614-first-user-route-receipts-v1"')) {
  fail('Asset manifest must track p0-route-receipts.js.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-route-receipts-helper.js')) {
  fail('npm run check must include smoke-check-p0-route-receipts-helper.js.');
}

const events = [];
const context = {
  window: {
    dispatchEvent(event) {
      events.push(event);
    },
  },
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail || {};
    }
  },
  URL,
};
vm.createContext(context);
vm.runInContext(helper, context, { filename: 'p0-route-receipts.js' });
const api = context.window.MimirP0RouteReceipts;
if (!api || api.version !== '20260614-first-user-route-receipts-v1') fail('P0 route receipts helper must register on window.');
if (api.hostedRouteLabel('api-staging.mmir.ai') !== 'Supergeni ready · hosted') fail('Hosted route label must stay clean for first-time users.');
if (api.displayName({ name: 'Route Name' }) !== 'Route Name') fail('displayName must normalize route names.');
if (api.displayName({ name: 'https://candidate.example/v1?token=sk-live-leaky-value' }) !== 'Supergeni') fail('displayName must fall back on tokenized URLs.');
if (api.displayName({ label: 'https://user:pass@candidate.example/v1' }) !== 'Supergeni') fail('displayName must fall back on URLs with embedded credentials.');
if (api.displayName({ display_name: 'Google key AIza123456789012345678901234567890' }) !== 'Supergeni') fail('displayName must fall back on Google-key-shaped values.');
if (api.displayName({ id: 'github ghp_leaky123456789012345678901' }) !== 'Supergeni') fail('displayName must fall back on GitHub-token-shaped values.');
if (api.receipt({ route: 'local', label: 'gemma3:270m' }).state !== 'local') fail('Local route receipt must return local state.');
if (api.receipt({ route: 'hosted' }, { apiLabel: 'api.mmir.ai' }).detail.includes('api.mmir.ai')) fail('Hosted receipt detail should not repeat API host in first-user receipt copy.');
if (!api.receipt({ route: 'hosted' }, { apiLabel: 'api.mmir.ai' }).detail.includes('No provider key')) fail('Hosted receipt detail must keep browser-secret guardrail.');
if (api.receipt({ route: 'hosted', routeClass: 'external-untrusted-free', label: 'Google: gemini-2.5-flash' }, { apiLabel: 'api.mmir.ai' }).text !== 'Google: gemini-2.5-flash · external free route') fail('External route receipt must name the selected external model cleanly.');
const unsafeReceipt = api.receipt({ route: 'hosted', routeClass: 'external-untrusted-free', label: 'https://candidate.example/v1?api_key=sk-live-leaky-value' }, { apiLabel: 'api.mmir.ai' });
if (unsafeReceipt.text !== 'Supergeni · external free route') fail('External route receipt must redact unsafe route labels.');
assertNoLeak(unsafeReceipt, 'Unsafe route receipt');
if (events[0]?.type !== 'mimir-p0-route-receipts-ready') fail('P0 route receipts helper must emit readiness evidence.');

console.log('P0 route receipts helper smoke passed.');
