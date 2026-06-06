import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-text.js'), 'utf8');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireOrder(source, before, after, message) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  if (beforeIndex < 0 || afterIndex < 0 || beforeIndex > afterIndex) fail(message);
}

requireIncludes(helper, "version='20260606-b1-06-p0-text-v1'", 'P0 text helper version must be explicit.');
requireIncludes(helper, 'safeText', 'P0 text helper must expose safeText.');
requireIncludes(helper, 'paragraphs', 'P0 text helper must expose paragraphs.');
requireIncludes(helper, 'formatDuration', 'P0 text helper must expose formatDuration.');
requireIncludes(shell, 'const P0_TEXT=window.MimirP0Text||{};', 'P0 shell must read the shared text helper.');
requireIncludes(shell, 'P0_TEXT.safeText?.(value)', 'P0 shell safeText must delegate to the helper.');
requireIncludes(shell, 'P0_TEXT.paragraphs?.(text)', 'P0 shell paragraphs must delegate to the helper.');
requireIncludes(shell, 'P0_TEXT.formatDuration', 'P0 shell duration formatting must delegate to the helper.');
requireIncludes(html, 'p0-text.js?v=20260606-b1-06-p0-text-v1', 'Public MMIR shell must load p0-text.js with a cache-busted version.');
requireOrder(html, 'p0-text.js?v=20260606-b1-06-p0-text-v1', 'p0-chat-shell.js?v=', 'P0 text helper must load before the P0 shell.');
requireIncludes(manifest, '"p0-text.js": "20260606-b1-06-p0-text-v1"', 'Asset manifest must track p0-text.js.');
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-text-helper.js')) {
  fail('npm run check must include smoke-check-p0-text-helper.js.');
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
vm.runInContext(helper, context, { filename: 'p0-text.js' });

const api = context.window.MimirP0Text;
if (!api || api.version !== '20260606-b1-06-p0-text-v1') fail('P0 text helper must register on window.');
if (api.safeText('<script>&"\'') !== '&lt;script&gt;&amp;&quot;&#39;') fail('safeText must HTML-escape special characters.');
if (api.safeAttr('"route"') !== '&quot;route&quot;') fail('safeAttr must delegate to safeText.');
if (api.paragraphs('one\n\ntwo') !== '<p>one</p><p>two</p>') fail('paragraphs must render escaped paragraph HTML.');
if (api.paragraphs('<x>') !== '<p>&lt;x&gt;</p>') fail('paragraphs must escape HTML.');
if (api.formatDuration(320) !== '320ms' || api.formatDuration(2500) !== '2.5s') fail('formatDuration must match the P0 receipt style.');
if (events[0]?.type !== 'mimir-p0-text-ready') fail('P0 text helper must emit readiness evidence.');

console.log('p0 text helper smoke passed');
