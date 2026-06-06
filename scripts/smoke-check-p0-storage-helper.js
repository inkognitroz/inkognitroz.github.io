import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-storage.js'), 'utf8');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!helper.includes("version='20260606-b1-06-p0-storage-v1'")) {
  fail('P0 storage helper version must be explicit.');
}
if (!helper.includes('readJson') || !helper.includes('writeJson') || !helper.includes('ensureSchema')) {
  fail('P0 storage helper must own JSON and schema storage helpers.');
}
if (!shell.includes('const P0_STORAGE=window.MimirP0Storage||{};')) {
  fail('P0 shell must read shared storage helper.');
}
if (!shell.includes('P0_STORAGE.readJson') || !shell.includes('P0_STORAGE.writeJson') || !shell.includes('P0_STORAGE.ensureSchema')) {
  fail('P0 shell must delegate JSON/schema storage to the helper.');
}
if (!html.includes('p0-storage.js?v=20260606-b1-06-p0-storage-v1')) {
  fail('Public MMIR shell must load p0-storage.js with a cache-busted version.');
}
if (html.indexOf('p0-storage.js?v=20260606-b1-06-p0-storage-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 storage helper must load before the P0 shell.');
}
if (!manifest.includes('"p0-storage.js": "20260606-b1-06-p0-storage-v1"')) {
  fail('Asset manifest must track p0-storage.js.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-storage-helper.js')) {
  fail('npm run check must include smoke-check-p0-storage-helper.js.');
}

const events = [];
const store = new Map();
const context = {
  window: {
    dispatchEvent(event) {
      events.push(event);
    },
  },
  localStorage: {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
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
vm.runInContext(helper, context, { filename: 'p0-storage.js' });
const api = context.window.MimirP0Storage;
if (!api || api.version !== '20260606-b1-06-p0-storage-v1') fail('P0 storage helper must register on window.');
if (!api.writeJson('models', [{ id: 'mmir-supergenius' }])) fail('writeJson should report success.');
if (api.readJson('models', [])[0]?.id !== 'mmir-supergenius') fail('readJson should return stored JSON.');
if (!api.writeString('active', 'mmir-supergenius')) fail('writeString should report success.');
if (api.readString('active', '') !== 'mmir-supergenius') fail('readString should return stored string.');
api.ensureSchema('schema', 'v1', ['models']);
if (api.readJson('models', null) !== null) fail('ensureSchema should reset listed keys on schema change.');
if (api.ensureSchema('schema', 'v1', ['active']) !== true) fail('ensureSchema should return true for current schema.');
if (api.readString('active', '') !== 'mmir-supergenius') fail('ensureSchema should not reset keys when schema already matches.');
if (events[0]?.type !== 'mimir-p0-storage-ready') fail('P0 storage helper must emit readiness evidence.');

console.log('P0 storage helper smoke passed.');
