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
if (!d199 || d199.status !== 'beta') {
  fail('Progress dashboard task D199 must stay beta after visible-control reliability ships.');
}

const d200 = tasks.find((task) => task.seq === 'D200');
if (!d200 || d200.status !== 'beta') {
  fail('Progress dashboard task D200 must stay beta after critical-shell headroom recovery ships.');
}

const d201 = tasks.find((task) => task.seq === 'D201');
if (!d201 || d201.status !== 'beta') {
  fail('Progress dashboard task D201 must stay beta after deploy QA verification ships.');
}

const d202 = tasks.find((task) => task.seq === 'D202');
if (!d202 || d202.status !== 'beta') {
  fail('Progress dashboard task D202 must stay beta after first-screen visual QA ships.');
}

const d203 = tasks.find((task) => task.seq === 'D203');
if (!d203 || d203.status !== 'beta') {
  fail('Progress dashboard task D203 must stay beta after composer model picker ships.');
}

const d206 = tasks.find((task) => task.seq === 'D206');
if (!d206 || d206.status !== 'beta') {
  fail('Progress dashboard must expose D206 as beta after installer-to-live-model proof ships.');
}

if (!Array.isArray(progressData.next_queue) || progressData.next_queue[0] !== 'D243') {
  fail('Progress dashboard next queue must prioritize D243 after D236 ships.');
}

if (!process.exitCode) {
  console.log('First-answer next-step smoke check passed.');
}
