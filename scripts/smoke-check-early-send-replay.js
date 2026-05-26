import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  html: join(publicDir, 'mmir.html'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
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
    fail(`Missing D297 early send file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const html = text(files.html);
const runtime = text(files.runtime);
const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;

requireIncludes(html, 'onclick="window.__MimirEarlySend=1"', 'Primary send must record early clicks before chat runtime binds.');
requireIncludes(html, 'chat-runtime.js?v=20260526-local-proof-auto-first-answer-v1', 'Chat runtime JS must be cache-busted for early send replay.');
requireIncludes(text(files.sw), "CACHE_NAME='mmir-pwa-d315-20260526-local-proof-auto-first-answer-v1'", 'Service worker cache must rotate for D297 early send replay.');

for (const needle of [
  'window.__MimirEarlySend=false;sendMessage()',
  'if(window.__MimirEarlySend){window.__MimirEarlySend=false',
  "setComposerActionFeedback('Starting from your first click. Free route stays automatic.'",
  'window.setTimeout(()=>sendMessage(),40)'
]) {
  requireIncludes(runtime, needle, `Chat runtime must replay early send clicks safely: ${needle}`);
}

requireIncludes(text(files.backlog), '| D297 | Chat UX / First Paint | P0 | Early send click replay |', 'Backlog must include D297 early send click replay.');
requireIncludes(text(files.log), 'D297 is now beta', 'Implementation log must include D297.');
requireIncludes(text(files.buildDashboard), "['D297'", 'Progress dashboard build must mark D297 status.');
requireIncludes(text(files.visualQa), 'D297 early send replay', 'Visual QA report must mention D297.');
requireIncludes(workflows, 'smoke-check-early-send-replay.js', 'GitHub workflows must run the D297 early send replay gate.');

if (!process.exitCode) {
  console.log('Early send replay smoke check passed.');
}
