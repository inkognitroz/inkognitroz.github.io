import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  composer: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  composerCss: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.css'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  onboarding: join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'),
  starters: join(publicDir, 'free-model-starters.json'),
  progress: join(publicDir, 'progress-dashboard.json'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing D207 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle)) fail(message);
}

const starters = json(files.starters);
const starterModels = Array.isArray(starters.models) ? starters.models : [];
const hasBrowserGuide = starterModels.some((model) => model.runtime === 'browser-guide' && model.status === 'live-browser');
const hasWebGpu = starterModels.some((model) => model.runtime === 'webllm' && String(model.status || '').includes('browser'));
const hasInstallable = starterModels.some((model) => model.runtime === 'ollama' && model.status === 'installable-free');

if (!hasBrowserGuide) fail('D207 starter catalog must keep at least one ready-now free browser guide.');
if (!hasWebGpu) fail('D207 starter catalog must keep at least one free browser WebGPU model candidate.');
if (!hasInstallable) fail('D207 starter catalog must keep at least one installable-free Ollama model.');

for (const needle of [
  'function freeRouteFloor(options)',
  'fallbackStarterModels',
  'starterCatalogLoaded',
  'composer-model-picker-free-route-floor',
  'Free route floor active',
  'No paid route starts here',
  'mmir-runtime-starter-handoff',
  "action:action==='install'?'install':'select'",
  'freeRouteFloor:()=>freeRouteFloor'
]) {
  requireIncludes(files.composer, needle, `D207 composer picker missing free-route hardening: ${needle}`);
}

for (const needle of [
  '.composer-route-floor',
  'color:#047857'
]) {
  requireIncludes(files.composerCss, needle, `D207 composer picker styling missing: ${needle}`);
}

for (const needle of [
  'Ready now: free browser helpers',
  'Ready now: free browser WebGPU LLMs',
  'Install to activate: free local Ollama models',
  'preferredStarterModel',
  "modelSelect.value=starterValue(preferred)"
]) {
  requireIncludes(files.chatRuntime, needle, `D207 chat runtime must keep free model classes selectable: ${needle}`);
}

requireIncludes(files.onboarding, 'Browser guide works now; local model activates after install.', 'D207 first-run gates must explain useful free fallback instead of empty model state.');
requireIncludes(files.qualityWorkflow, 'smoke-check-free-live-route-hardening.js', 'D207 quality workflow must run free live-route hardening.');
requireIncludes(files.pagesWorkflow, 'smoke-check-free-live-route-hardening.js', 'D207 Pages workflow must run free live-route hardening.');
requireIncludes(files.backlog, '| D208 |', 'Backlog must keep a next sequential work item after D207.');

const progress = json(files.progress);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d207 = tasks.find((task) => task.seq === 'D207');
const d208 = tasks.find((task) => task.seq === 'D208');
if (!d207 || d207.status !== 'beta') {
  fail('Progress dashboard task D207 must be beta after free live-model route hardening ships.');
}
if (!d208 || d208.status !== 'next') {
  fail('Progress dashboard task D208 must become the next work item after D207 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D208') {
  fail('Progress dashboard next queue must prioritize D208 after D207 ships.');
}

if (!process.exitCode) {
  console.log('Free live-route hardening smoke check passed.');
}
