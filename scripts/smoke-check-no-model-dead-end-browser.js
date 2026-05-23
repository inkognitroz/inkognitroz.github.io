import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  mmir: join(publicDir, 'mmir.html'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  composer: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  onboarding: join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
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
    fail(`Missing D208 file: ${relative(root, file)}`);
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

function requireNotIncludes(file, needle, message) {
  if (text(file).includes(needle)) fail(message);
}

const starters = json(files.starters);
const starterModels = Array.isArray(starters.models) ? starters.models : [];
const routeDom = starterModels.map((model) => ({
  id: model.id,
  runtime: model.runtime,
  label: model.label,
  action: model.runtime === 'ollama' ? 'Install / prove' : 'Use now',
  target: model.runtime === 'ollama' ? '#local-connector' : '#mimir-prompt',
  free: String(model.cost || '').includes('free') || model.runtime === 'browser-guide'
}));

const hasGuideAction = routeDom.some((item) => item.runtime === 'browser-guide' && item.action === 'Use now' && item.target === '#mimir-prompt' && item.free);
const hasInstallAction = routeDom.some((item) => item.runtime === 'ollama' && item.action === 'Install / prove' && item.target === '#local-connector' && item.free);
const hasWebGpuAction = routeDom.some((item) => item.runtime === 'webllm' && item.action === 'Use now' && item.free);

if (!hasGuideAction) fail('D208 DOM route matrix must include a ready-now free guide action.');
if (!hasInstallAction) fail('D208 DOM route matrix must include a free local install/proof action.');
if (!hasWebGpuAction) fail('D208 DOM route matrix must include a free browser WebGPU action.');

for (const needle of [
  'function noModelFallbackStarter()',
  'No live backend model yet. MMIR selected a free starter route instead.',
  'await sendStarterMessage(fallback,prompt)',
  'Open + Add model for free browser and local install choices',
  'preferredStarterModel',
  'modelSelect.value=starterValue(preferred)'
]) {
  requireIncludes(files.chatRuntime, needle, `D208 chat runtime missing no-model fallback evidence: ${needle}`);
}

for (const needle of [
  'function freeRouteFloor(options)',
  'Free route floor active',
  'No paid route starts here',
  'composer-model-picker-free-route-floor'
]) {
  requireIncludes(files.composer, needle, `D208 composer picker must keep free choices visible: ${needle}`);
}

for (const needle of [
  'id="mimir-prompt"',
  'primary-chat-link',
  'mimir-chat-runtime'
]) {
  requireIncludes(files.mmir, needle, `D208 static page must keep first chat DOM anchor: ${needle}`);
}

requireIncludes(files.onboarding, 'Browser guide works now; local model activates after install.', 'D208 first-run gates must turn no-live-model into useful free guidance.');
requireIncludes(files.firstImpression, 'Free browser route ready.', 'D208 first screen must show a useful browser-guide state.');
requireNotIncludes(files.chatRuntime, 'No live model is available from this backend.', 'D208 must remove the old no-live-model dead end message.');
requireIncludes(files.qualityWorkflow, 'smoke-check-no-model-dead-end-browser.js', 'D208 quality workflow must run no-model dead-end gate.');
requireIncludes(files.pagesWorkflow, 'smoke-check-no-model-dead-end-browser.js', 'D208 Pages workflow must run no-model dead-end gate.');
requireIncludes(files.backlog, '| D209 |', 'Backlog must keep D209 as the first-chat no-model DOM fixture after D208.');
requireIncludes(files.backlog, '| D210 |', 'Backlog must keep D210 as the no-model visual pass after D209.');
requireIncludes(files.backlog, '| D211 |', 'Backlog must keep a next sequential work item after D210.');
requireIncludes(files.backlog, '| D212 |', 'Backlog must keep a next sequential work item after D211.');
requireIncludes(files.backlog, '| D213 |', 'Backlog must keep a next sequential work item after D212.');
requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progress);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d208 = tasks.find((task) => task.seq === 'D208');
const d209 = tasks.find((task) => task.seq === 'D209');
const d210 = tasks.find((task) => task.seq === 'D210');
const d211 = tasks.find((task) => task.seq === 'D211');
const d212 = tasks.find((task) => task.seq === 'D212');
const d213 = tasks.find((task) => task.seq === 'D213');
const d214 = tasks.find((task) => task.seq === 'D214');
const d225 = tasks.find((task) => task.seq === 'D225');
if (!d208 || d208.status !== 'beta') {
  fail('Progress dashboard task D208 must be beta after no-model dead-end browser gate ships.');
}
if (!d209 || d209.status !== 'beta') {
  fail('Progress dashboard task D209 must be beta after first-chat no-model DOM fixture ships.');
}
if (!d210 || d210.status !== 'beta') {
  fail('Progress dashboard task D210 must be beta after no-model visual pass ships.');
}
if (!d211 || d211.status !== 'beta') {
  fail('Progress dashboard task D211 must be beta after public no-model deploy verification ships.');
}
if (!d212 || d212.status !== 'beta') {
  fail('Progress dashboard task D212 must be beta after first free chat response QA ships.');
}
if (!d213 || d213.status !== 'beta') {
  fail('Progress dashboard task D213 must be beta after composer action bar usefulness ships.');
}
if (!d214 || d214.status !== 'beta') {
  fail('Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
}
if (!d225 || d225.status !== 'next') {
  fail('Progress dashboard task D225 must become the next work item after D224 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D225') {
  fail('Progress dashboard next queue must prioritize D225 after D224 ships.');
}

if (!process.exitCode) {
  console.log('No-model dead-end browser smoke check passed.');
}
