import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  firstScreen: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  starters: join(publicDir, 'free-model-starters.json'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing device starter recommendation file: ${relative(root, file)}`);
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

const progressData = json(files.progressData);
const first = text(files.firstScreen);
const starters = json(files.starters);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const starterModels = Array.isArray(starters.models) ? starters.models : [];

for (const needle of [
  'function deviceStarterRecommendation()',
  "'mobile client'",
  "'Raspberry Pi / Linux ARM'",
  "'Linux / VM'",
  "'macOS'",
  "'Windows'",
  "'gemma3:270m'",
  "'qwen3:0.6b'",
  "'llama3.2:1b'",
  "'gemma3:1b'",
  "kind:'install-starter'",
  "select.value='starter:'+starterId",
  'dataset.starterModel',
  'dataset.deviceClass',
  'recommended_starter:'
]) {
  if (!first.includes(needle)) fail(`First-screen device starter recommendation missing evidence: ${needle}`);
}

for (const id of ['ollama-gemma3-270m', 'ollama-qwen3-06b', 'ollama-llama32-1b', 'ollama-gemma3-1b']) {
  const model = starterModels.find((item) => item.id === id);
  if (!model || model.runtime !== 'ollama' || model.status !== 'installable-free' || !String(model.cost || '').includes('free')) {
    fail(`Device starter ${id} must exist as an installable-free Ollama model.`);
  }
}

for (const needle of [
  'deviceStarterRecommendation',
  'recommended_starter:',
  'dataset.starterModel',
  'dataset.deviceClass'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing device starter evidence: ${needle}`);
}

const d185 = tasks.find((task) => task.seq === 'D185');
if (!d185 || d185.status !== 'beta') {
  fail('Progress dashboard task D185 must be beta after device starter recommendation ships.');
}

const d186 = tasks.find((task) => task.seq === 'D186');
if (!d186 || d186.status !== 'next') {
  fail('Progress dashboard must expose D186 as the next activation work item.');
}

if (!process.exitCode) {
  console.log('Device starter recommendation smoke check passed.');
}
