import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  hydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing first-answer send handoff file: ${relative(root, file)}`);
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
const nodeDashboard = text(files.nodeDashboard);
const hydration = text(files.hydration);
const progressDashboard = text(files.progressDashboard);
const coverage = text(files.coverage);
const progressData = json(files.progressData);

for (const needle of [
  "{id:'chat-now',label:'Send first answer'}",
  "promptEl.dispatchEvent(new Event('input',{bubbles:true}))",
  "setStatus('Sending first verified answer...','loading')",
  'window.setTimeout(()=>primaryLink?.click(),40)'
]) {
  if (!chatRuntime.includes(needle)) fail(`Chat runtime missing first-answer send handoff evidence: ${needle}`);
}

for (const [label, source] of [
  ['first screen', firstImpression],
  ['first-screen hydration', hydration],
  ['Node Dashboard', nodeDashboard],
  ['Progress Dashboard', progressDashboard]
]) {
  if (!source.includes('Send first answer')) fail(`${label} must expose a Send first answer action.`);
}

for (const needle of [
  "document.getElementById('primary-chat-link')?.click()",
  'runFirstChatRecovery',
  'prompt.dispatchEvent(new Event'
]) {
  if (!progressDashboard.includes(needle)) fail(`Progress Dashboard missing first-answer handoff evidence: ${needle}`);
}

for (const needle of [
  'Send first answer',
  'first-answer-send-handoff',
  'primary-chat-link',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing first-answer handoff evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d197 = tasks.find((task) => task.seq === 'D197');
if (!d197 || d197.status !== 'beta') {
  fail('Progress dashboard task D197 must be beta after first-answer send handoff ships.');
}

const d198 = tasks.find((task) => task.seq === 'D198');
if (!d198 || d198.status !== 'beta') {
  fail('Progress dashboard task D198 must stay beta after first-answer success next-step ships.');
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

if (!Array.isArray(progressData.next_queue) || progressData.next_queue[0] !== 'D226') {
  fail('Progress dashboard next queue must prioritize D226 after D225 ships.');
}

if (!process.exitCode) {
  console.log('First-answer send handoff smoke check passed.');
}
