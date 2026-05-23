import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  starters: join(publicDir, 'free-model-starters.json'),
  catalogUi: join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  hydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  css: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing recommended starter focus file: ${relative(root, file)}`);
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

const catalogUi = text(files.catalogUi);
const firstImpression = text(files.firstImpression);
const hydration = text(files.hydration);
const progressDashboard = text(files.progressDashboard);
const css = text(files.css);
const coverage = text(files.coverage);
const progressData = json(files.progressData);
const starters = json(files.starters);

for (const needle of [
  './free-model-starters.json',
  'starterModelToCatalog',
  'mergeStarterModels',
  'latestRecommendedStarter',
  'isRecommendedStarter',
  'focusRecommendedStarter',
  'pendingRecommendedFocus',
  'mmir-model-library-focus-recommended',
  'data-recommended-starter',
  'is-recommended-starter',
  'Recommended for this device. Free/local path; no paid route starts here.'
]) {
  if (!catalogUi.includes(needle)) fail(`Model catalog UI missing recommended starter focus evidence: ${needle}`);
}

for (const file of [
  ['first impression', firstImpression],
  ['first-screen hydration', hydration],
  ['progress dashboard', progressDashboard]
]) {
  if (!file[1].includes('mmir-model-library-focus-recommended')) {
    fail(`${file[0]} must dispatch model-library recommended starter focus events.`);
  }
  if (!file[1].includes('no_paid_routes_started:true')) {
    fail(`${file[0]} must preserve no-spend evidence for recommended starter focus.`);
  }
}

for (const needle of [
  '.model-card.is-recommended-starter',
  '.model-recommended-note',
  '.model-card.is-focus-pulse'
]) {
  if (!css.includes(needle)) fail(`Recommended starter focus styling missing: ${needle}`);
}

for (const needle of [
  'model-library-focus-recommended',
  'data-recommended-starter',
  'recommended starter',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing recommended starter focus evidence: ${needle}`);
}

const starterIds = new Set((Array.isArray(starters.models) ? starters.models : []).map((model) => model.id));
for (const id of ['ollama-gemma3-270m', 'ollama-qwen3-06b', 'ollama-llama32-1b', 'ollama-gemma3-1b']) {
  if (!starterIds.has(id)) fail(`Free starter catalog must include device recommendation model: ${id}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d192 = tasks.find((task) => task.seq === 'D192');
if (!d192 || d192.status !== 'beta') {
  fail('Progress dashboard task D192 must be beta after recommended starter model-library focus ships.');
}

const d193 = tasks.find((task) => task.seq === 'D193');
if (!d193 || d193.status !== 'next') {
  fail('Progress dashboard must expose D193 as the next recommended starter install handoff work item.');
}

if (!process.exitCode) {
  console.log('Recommended starter model-library focus smoke check passed.');
}
