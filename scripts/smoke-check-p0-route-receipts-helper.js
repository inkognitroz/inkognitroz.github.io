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

if (!helper.includes("version='20260613-external-route-receipts-v1'")) {
  fail('P0 route receipts helper version must be explicit.');
}
if (!helper.includes("'Supergeni · Free · '+String(apiLabel||'api.mmir.ai')")) {
  fail('P0 route receipts helper must own hosted route label copy.');
}
if (!helper.includes('Private · This Mac') || !helper.includes('No provider key is stored in the browser')) {
  fail('P0 route receipts helper must own local and hosted receipt text.');
}
if (!helper.includes("displayName(model)+' · External · '+String(apiLabel||'api.mmir.ai')")) {
  fail('P0 route receipts helper must own external route receipt text.');
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
if (!html.includes('p0-route-receipts.js?v=20260613-external-route-receipts-v1')) {
  fail('Public MMIR shell must load p0-route-receipts.js with a cache-busted version.');
}
if (html.indexOf('p0-route-receipts.js?v=20260613-external-route-receipts-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 route receipts helper must load before the P0 shell.');
}
if (!manifest.includes('"p0-route-receipts.js": "20260613-external-route-receipts-v1"')) {
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
};
vm.createContext(context);
vm.runInContext(helper, context, { filename: 'p0-route-receipts.js' });
const api = context.window.MimirP0RouteReceipts;
if (!api || api.version !== '20260613-external-route-receipts-v1') fail('P0 route receipts helper must register on window.');
if (api.hostedRouteLabel('api-staging.mmir.ai') !== 'Supergeni · Free · api-staging.mmir.ai') fail('Hosted route label must use supplied API host.');
if (api.displayName({ name: 'Route Name' }) !== 'Route Name') fail('displayName must normalize route names.');
if (api.receipt({ route: 'local', label: 'gemma3:270m' }).state !== 'local') fail('Local route receipt must return local state.');
if (!api.receipt({ route: 'hosted' }, { apiLabel: 'api.mmir.ai' }).text.includes('api.mmir.ai')) fail('Hosted receipt must include API host.');
if (api.receipt({ route: 'hosted', routeClass: 'external-untrusted-free', label: 'Google: gemini-2.5-flash' }, { apiLabel: 'api.mmir.ai' }).text !== 'Google: gemini-2.5-flash · External · api.mmir.ai') fail('External route receipt must name the selected external model.');
if (events[0]?.type !== 'mimir-p0-route-receipts-ready') fail('P0 route receipts helper must emit readiness evidence.');

console.log('P0 route receipts helper smoke passed.');
