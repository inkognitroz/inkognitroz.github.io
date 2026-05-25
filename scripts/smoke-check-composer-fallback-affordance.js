import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  html: join(publicDir, 'mmir.html'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  runtimeJs: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
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
    fail(`Missing composer affordance file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const html = text(files.html);
const runtimeCss = text(files.runtimeCss).replace(/\s+/g, ' ');
const runtimeJs = text(files.runtimeJs);
const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;

for (const needle of [
  'id="new-backend" type="button" class="btn btn-secondary" aria-label="Add or connect model" title="Add model">+</button>',
  'id="primary-chat-link" type="submit" class="btn btn-primary" aria-label="Send prompt to the active route" title="Send">&#8593;</button>',
  'chat-runtime.css?v=20260525-composer-affordance-v1',
  'chat-runtime.js?v=20260525-composer-affordance-v1'
]) {
  requireIncludes(html, needle, `First-paint composer affordance missing: ${needle}`);
}

for (const needle of [
  '#primary-chat-link.btn-primary, .composer-actions #new-backend',
  'body.mimir-composer-dock-ready .composer-actions #new-backend',
  'width: 44px',
  'border-radius: 999px'
]) {
  requireIncludes(runtimeCss, needle, `Composer fallback affordance styling missing: ${needle}`);
}

for (const needle of [
  "document.body.classList.add('mimir-composer-dock-ready')",
  "primaryLink.textContent='\\u2191'",
  "primaryLink.setAttribute('title','Send')",
  "composer-add-model"
]) {
  requireIncludes(runtimeJs, needle, `Runtime composer affordance handoff missing: ${needle}`);
}

requireIncludes(text(files.sw), "CACHE_NAME='mmir-pwa-d294-20260525-composer-affordance-v1'", 'Service worker cache must rotate for the composer affordance fix.');
requireIncludes(text(files.backlog), '| D294 | Chat UX / First Paint | P0 | Composer fallback affordance |', 'Backlog must include D294 composer fallback affordance.');
requireIncludes(text(files.buildDashboard), "['D294'", 'Progress dashboard build must mark D294 status.');
requireIncludes(workflows, 'smoke-check-composer-fallback-affordance.js', 'GitHub workflows must run the composer affordance smoke gate.');

if (!process.exitCode) {
  console.log('Composer fallback affordance smoke check passed.');
}
