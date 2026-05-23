import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing first-answer next-step file: ${relative(root, file)}`);
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
const firstImpression = text(files.firstImpression);
const progressDashboard = text(files.progressDashboard);
const coverage = text(files.coverage);
const progressData = json(files.progressData);

for (const needle of [
  "proofRepairActions('answered')",
  "{id:'save-chat',label:'Save chat'}",
  'First verified chat answered. Save it or keep building.'
]) {
  if (!chatRuntime.includes(needle)) fail(`Chat runtime missing first-answer next-step evidence: ${needle}`);
}

for (const needle of [
  'First answer worked',
  "kind:'save-chat'",
  '#conversation-manager-panel'
]) {
  if (!firstImpression.includes(needle)) fail(`First screen missing first-answer next-step evidence: ${needle}`);
}

for (const needle of [
  'function firstAnswerNextStep()',
  'progress-first-answer-next-step',
  'first-answer-next-step',
  'mimir-conversations-v1:',
  "kind:'add-memory'"
]) {
  if (!progressDashboard.includes(needle)) fail(`Progress Dashboard missing first-answer next-step evidence: ${needle}`);
}

for (const needle of [
  'first-answer-next-step',
  'Save chat',
  'Connect local node',
  'Add memory',
  'raw_prompt_stored:false'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing first-answer next-step evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d198 = tasks.find((task) => task.seq === 'D198');
if (!d198 || d198.status !== 'beta') {
  fail('Progress dashboard task D198 must be beta after first-answer next-step ships.');
}

const d199 = tasks.find((task) => task.seq === 'D199');
if (!d199 || d199.status !== 'next') {
  fail('Progress dashboard must expose D199 as the next visible-control reliability work item.');
}

if (!Array.isArray(progressData.next_queue) || progressData.next_queue[0] !== 'D199') {
  fail('Progress dashboard next queue must prioritize D199 after D198 ships.');
}

if (!process.exitCode) {
  console.log('First-answer next-step smoke check passed.');
}
