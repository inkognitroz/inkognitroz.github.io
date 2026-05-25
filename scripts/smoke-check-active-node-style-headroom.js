import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  activeStrip: join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js'),
  deferredCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime-deferred.css'),
  mmir: join(publicDir, 'mmir.html'),
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
    fail(`Missing D301 active-node style headroom file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const activeStrip = text(files.activeStrip);
const deferredCss = text(files.deferredCss);
const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;
const activeStripBytes = Buffer.byteLength(activeStrip.replace(/\r\n/g, '\n'), 'utf8');

if (activeStripBytes > 17200) {
  fail(`Active-node strip critical JS is too large after style split: ${activeStripBytes} bytes.`);
}

for (const needle of [
  '#mmir-active-nodes-bar{border:1px solid #10a37f38',
  '.mmir-active-node-card dl{display:none}',
  'function handoff(detail)'
]) {
  requireIncludes(activeStrip, needle, `Active-node strip must keep only minimal critical layout/safety JS: ${needle}`);
}

for (const forbidden of [
  'box-shadow:0 10px 28px',
  '.mmir-active-node-title span,.mmir-active-node-card span',
  '.mmir-active-starter-rail button[data-route-state="setup"]{background:#fff7ed'
]) {
  if (activeStrip.includes(forbidden)) fail(`Active-node decorative CSS should be deferred, not embedded in critical JS: ${forbidden}`);
}

for (const needle of [
  '#mmir-active-nodes-bar{background:#ffffffe6;box-shadow:0 10px 28px',
  '.mmir-active-node-title span,.mmir-active-node-card span',
  '.mmir-active-starter-rail button[data-route-state="setup"]{background:#fff7ed',
  '.mmir-active-node-card[data-node-state="online"]'
]) {
  requireIncludes(deferredCss, needle, `Deferred runtime CSS must own active-node polish: ${needle}`);
}

requireIncludes(text(files.mmir), 'chat-runtime-deferred.css?v=20260525-active-node-style-headroom-v1', 'MMIR page must cache-bust deferred runtime CSS for active-node style split.');
requireIncludes(text(files.backlog), '| D301 | Performance / Chat UX | P0 | Active node style headroom split |', 'Backlog must include D301 active node style headroom split.');
requireIncludes(text(files.log), 'D301 is now beta', 'Implementation log must include D301.');
requireIncludes(text(files.buildDashboard), "['D301'", 'Progress dashboard build must mark D301 status.');
requireIncludes(text(files.visualQa), 'D301 active node style headroom split', 'Visual QA report must mention D301.');
requireIncludes(workflows, 'smoke-check-active-node-style-headroom.js', 'GitHub workflows must run D301 active-node style headroom gate.');

if (!process.exitCode) {
  console.log(`Active-node style headroom smoke check passed at ${activeStripBytes} critical JS bytes.`);
}
