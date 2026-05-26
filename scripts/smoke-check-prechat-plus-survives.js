import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  html: join(publicDir, 'mmir.html'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  sw: join(publicDir, 'sw.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing pre-chat plus file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const html = text(files.html);
const css = text(files.runtimeCss).replace(/\s+/g, ' ');
const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;

for (const needle of [
  'chat-runtime.css?v=20260525-prechat-plus-v1',
  'id="new-backend" type="button" class="btn btn-secondary" aria-label="Add or connect model" title="Add model">+</button>'
]) {
  requireIncludes(html, needle, `Pre-chat plus shell missing: ${needle}`);
}

for (const needle of [
  '.mimir-public-chat:not(.mimir-has-chat) .composer-mode-dock{display:grid!important;grid-template-areas:"tools"!important;grid-template-columns:auto!important;justify-content:start!important}',
  '.mimir-public-chat:not(.mimir-has-chat) .composer-tool-cluster{display:flex!important;grid-area:tools!important;overflow:visible!important}',
  '.mimir-public-chat:not(.mimir-has-chat) :is(.composer-live-cluster,[data-chat-mode],#runtime-model-chip,#runtime-resource-chip),.mimir-public-chat:not(.mimir-has-chat) .composer-tool-cluster > :not(#composer-add-model){display:none!important}',
  '.mimir-public-chat:not(.mimir-has-chat) #composer-add-model{display:inline-flex!important}',
  'body.mimir-composer-dock-ready .composer-actions #new-backend'
]) {
  requireIncludes(css, needle, `Critical runtime CSS must keep the pre-chat plus alive: ${needle}`);
}

if (css.includes('.mimir-public-chat:not(.mimir-has-chat) :is(.composer-mode-dock,.composer-tool-cluster')) {
  fail('Critical runtime CSS must not hide the whole composer dock before chat.');
}

requireIncludes(text(files.sw), "CACHE_NAME='mmir-pwa-d312-20260526-local-model-presence-ready-v1'", 'Service worker cache must rotate for the pre-chat plus fix.');
requireIncludes(text(files.backlog), '| D295 | Chat UX / First Paint | P0 | Pre-chat plus survives deferred styling |', 'Backlog must include D295 pre-chat plus survival.');
requireIncludes(text(files.buildDashboard), "['D295'", 'Progress dashboard build must mark D295 status.');
requireIncludes(workflows, 'smoke-check-prechat-plus-survives.js', 'GitHub workflows must run the pre-chat plus smoke gate.');

if (!process.exitCode) {
  console.log('Pre-chat plus survival smoke check passed.');
}
