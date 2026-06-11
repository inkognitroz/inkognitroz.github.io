import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-icons.js'), 'utf8');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!helper.includes("version='20260611-lightning-toolbar-icons-v1'")) {
  fail('P0 icons helper version must be explicit.');
}
if (!helper.includes('p0-icon-shield') || !helper.includes('p0-icon-mic')) {
  fail('P0 icons helper must own shield and mic SVGs.');
}
if (!shell.includes('const P0_ICONS=window.MimirP0Icons||{};')) {
  fail('P0 shell must read shared icons helper.');
}
if (shell.includes('<svg class="p0-icon')) {
  fail('P0 shell must not own inline SVG icon markup.');
}
if (!html.includes('p0-icons.js?v=20260611-lightning-toolbar-icons-v1')) {
  fail('Public MMIR shell must load p0-icons.js with a cache-busted version.');
}
if (html.indexOf('p0-icons.js?v=20260611-lightning-toolbar-icons-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 icons helper must load before the P0 shell.');
}
if (!manifest.includes('"p0-icons.js": "20260611-lightning-toolbar-icons-v1"')) {
  fail('Asset manifest must track p0-icons.js.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-icons-helper.js')) {
  fail('npm run check must include smoke-check-p0-icons-helper.js.');
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
vm.runInContext(helper, context, { filename: 'p0-icons.js' });
const api = context.window.MimirP0Icons;
if (!api || api.version !== '20260611-lightning-toolbar-icons-v1') fail('P0 icons helper must register on window.');
if (!api.shield.includes('p0-icon-shield') || !api.mic.includes('p0-icon-mic')) fail('P0 icons helper API must expose shield and mic.');
if (events[0]?.type !== 'mimir-p0-icons-ready') fail('P0 icons helper must emit readiness evidence.');

console.log('P0 icons helper smoke passed.');
