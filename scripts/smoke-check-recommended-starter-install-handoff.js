import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  catalogUi: join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  css: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing recommended starter install handoff file: ${relative(root, file)}`);
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
const chatRuntime = text(files.chatRuntime);
const css = text(files.css);
const coverage = text(files.coverage);
const progressData = json(files.progressData);

for (const needle of [
  'function handoffStarter(id,action)',
  'data-starter-id',
  'data-starter-action',
  'Install / prove in chat',
  'mmir-runtime-starter-handoff',
  'model-library-starter-handoff',
  'starter_id:model.id',
  'no_paid_routes_started:true'
]) {
  if (!catalogUi.includes(needle)) fail(`Model Library missing install handoff evidence: ${needle}`);
}

for (const needle of [
  'pendingStarterHandoff',
  'function selectStarterModelById(starterId)',
  'function runStarterHandoff(detail)',
  'mmir-runtime-starter-handoff',
  "detail?.action==='install'",
  'installSelectedStarterModel()',
  'preferProofModel(starter.model)',
  'Runtime selected',
  'no_paid_routes_started:true'
]) {
  if (!chatRuntime.includes(needle)) fail(`Chat runtime missing starter handoff evidence: ${needle}`);
}

for (const needle of [
  '.model-card-actions',
  '.model-card-actions button:first-child'
]) {
  if (!css.includes(needle)) fail(`Starter handoff styling missing: ${needle}`);
}

for (const needle of [
  '[data-starter-id]',
  'mmir-runtime-starter-handoff',
  'Install / prove in chat',
  'runtime-starter-handoff',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing starter handoff evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d193 = tasks.find((task) => task.seq === 'D193');
if (!d193 || d193.status !== 'beta') {
  fail('Progress dashboard task D193 must be beta after recommended starter install handoff ships.');
}

const d194 = tasks.find((task) => task.seq === 'D194');
if (!d194 || d194.status !== 'next') {
  fail('Progress dashboard must expose D194 as the next starter install repair fallback work item.');
}

if (!process.exitCode) {
  console.log('Recommended starter install handoff smoke check passed.');
}
