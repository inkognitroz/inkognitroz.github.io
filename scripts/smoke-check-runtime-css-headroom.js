import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  html: join(publicDir, 'mmir.html'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  deferredCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime-deferred.css'),
  quickCss: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-quick-actions.css'),
  sw: join(publicDir, 'sw.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  log: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  visualQa: join(publicDir, 'visual-qa-report.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing D296 CSS headroom file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([a-zA-Z0-9:-]+)(?:=["']([^"']*)["'])?/g)].map((match) => [match[1], match[2] || '']));
}

function localAssetPath(fromFile, asset) {
  if (!asset || /^[a-z][a-z0-9+.-]*:/i.test(asset) || asset.startsWith('#')) return null;
  const clean = asset.split(/[?#]/)[0];
  if (!clean || clean.startsWith('//')) return null;
  const base = clean.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, clean.replace(/^\//, '')));
}

function assetSize(fromFile, asset) {
  const file = localAssetPath(fromFile, asset);
  if (!file || !file.startsWith(publicDir) || !existsSync(file)) return 0;
  return Buffer.byteLength(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
}

const html = text(files.html);
const runtimeCss = text(files.runtimeCss).replace(/\r\n/g, '\n');
const deferredCss = text(files.deferredCss).replace(/\r\n/g, '\n');
const quickCss = text(files.quickCss).replace(/\r\n/g, '\n');
const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;
const cssTags = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map((match) => match[0]);
const blockingCssBytes = cssTags
  .filter((tag) => attrs(tag).media !== 'print')
  .reduce((sum, tag) => sum + assetSize(files.html, attrs(tag).href), 0);

if (blockingCssBytes > 67000) {
  fail(`D296 blocking CSS headroom regressed: ${blockingCssBytes} bytes exceeds 67000.`);
}

requireIncludes(
  html,
  'chat-runtime-deferred.css?v=20260526-stale-offline-model-proof-v1" media="print" onload="this.media=\'all\'" data-mimir-deferred-style',
  'MMIR page must load chat runtime helper styling as deferred CSS.'
);
requireIncludes(text(files.sw), "CACHE_NAME='mmir-pwa-d318-20260526-instant-guide-default-v1'", 'Service worker cache must rotate for D296 runtime CSS headroom.');
requireIncludes(text(files.sw), './apps/mimir-chat-portal/chat-runtime-deferred.css', 'Service worker must cache deferred runtime CSS for offline install/model helper paths.');

for (const needle of [
  '.runtime-model-helper{display:grid',
  '.runtime-install-grid{display:grid',
  '.runtime-model-install-status{padding:8px 10px',
  '.runtime-model-install-status[data-state="ready"]'
]) {
  requireIncludes(deferredCss, needle, `Deferred runtime CSS must own helper styling: ${needle}`);
}

for (const forbidden of [
  '.runtime-model-helper {',
  '.runtime-install-grid {',
  '.runtime-model-install-status {'
]) {
  if (runtimeCss.includes(forbidden)) fail(`Blocking runtime CSS still owns deferred helper styling: ${forbidden}`);
}

if (quickCss.includes('body.mimir-public-chat:not(.mimir-has-chat) :is(\n  .composer-mode-dock,\n  .composer-tool-cluster')) {
  fail('Deferred quick-actions CSS must not reintroduce the old whole-dock hide rule.');
}
requireIncludes(quickCss, 'body.mimir-public-chat:not(.mimir-has-chat) #composer-add-model', 'Deferred quick-actions CSS must keep the pre-chat plus visibility rule aligned with critical CSS.');

requireIncludes(text(files.backlog), '| D296 | Performance / First Paint | P0 | Runtime CSS headroom recovery |', 'Backlog must include D296 runtime CSS headroom recovery.');
requireIncludes(text(files.log), 'D296 is now beta', 'Implementation log must include D296.');
requireIncludes(text(files.buildDashboard), "['D296'", 'Progress dashboard build must mark D296 status.');
requireIncludes(text(files.visualQa), 'D296 runtime CSS headroom', 'Visual QA report must mention D296.');
requireIncludes(workflows, 'smoke-check-runtime-css-headroom.js', 'GitHub workflows must run the D296 runtime CSS headroom gate.');

if (!process.exitCode) {
  console.log(`Runtime CSS headroom smoke check passed at ${blockingCssBytes} blocking CSS bytes.`);
}
