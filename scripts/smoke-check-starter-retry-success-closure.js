import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  hydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing starter retry success closure file: ${relative(root, file)}`);
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

const chatRuntime = text(files.chatRuntime);
const nodeDashboard = text(files.nodeDashboard);
const hydration = text(files.hydration);
const coverage = text(files.coverage);
const progressData = json(files.progressData);

for (const needle of [
  'function closeStarterRetrySuccess(readyModel)',
  "status:'verified'",
  'model_count:1',
  "target:'#mimir-prompt'",
  'starter-retry-success',
  'first_chat_ready:true',
  'Give me my first useful MMIR answer with',
  'closeStarterRetrySuccess(readyModel)'
]) {
  if (!chatRuntime.includes(needle)) fail(`Chat runtime missing starter retry success closure evidence: ${needle}`);
}

for (const needle of [
  'Starter repair verified',
  'preparing proof and first chat',
  '#mimir-prompt'
]) {
  if (!nodeDashboard.includes(needle)) fail(`Node Dashboard missing starter retry success visibility evidence: ${needle}`);
  if (!hydration.includes(needle)) fail(`First-screen hydration missing starter retry success visibility evidence: ${needle}`);
}

for (const needle of [
  'starter-retry-success',
  'first_chat_ready:true',
  'mimir-prompt',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing starter retry success evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d196 = tasks.find((task) => task.seq === 'D196');
if (!d196 || d196.status !== 'beta') {
  fail('Progress dashboard task D196 must be beta after starter retry success closure ships.');
}

const d197 = tasks.find((task) => task.seq === 'D197');
if (!d197 || d197.status !== 'beta') {
  fail('Progress dashboard task D197 must stay beta after first-answer send handoff ships.');
}

const d198 = tasks.find((task) => task.seq === 'D198');
if (!d198 || d198.status !== 'next') {
  fail('Progress dashboard must expose D198 as the next first-answer success next-step work item.');
}

if (!process.exitCode) {
  console.log('Starter retry success closure smoke check passed.');
}
